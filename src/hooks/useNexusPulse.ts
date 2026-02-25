'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { useGameStore, Task, Habit, VocabWord } from '@/store/useGameStore';

// ────────────────────────────────────────────────────────────────────────────
// Nexus Pulse — Client-side heuristic engine
//
// All "insights" below are computed from local state with ZERO API calls.
// A single optional daily Gemini call via /api/nexus-pulse adds the
// cross-domain narrative synthesis on top.
// ────────────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'celebration';
export type InsightDomain = 'energy' | 'quests' | 'habits' | 'vocab' | 'focus' | 'streaks' | 'cross-domain' | 'goals';

export interface PulseInsight {
    id: string;
    icon: string;
    title: string;
    description: string;
    severity: InsightSeverity;
    domain: InsightDomain;
    actionLabel?: string;
    actionHref?: string;
}

export interface AISynthesis {
    topInsight: string;
    burnoutRisk: number; // 0-1
    momentum: 'rising' | 'steady' | 'declining';
    suggestion: string;
    celebrationOpportunity?: string;
}

export interface NexusPulseData {
    insights: PulseInsight[];
    aiSynthesis: AISynthesis | null;
    isLoadingAI: boolean;
    refreshAI: () => Promise<void>;
    lastAIRefresh: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

function countCompletedOnDate(tasks: Task[], date: string): number {
    return tasks.filter(t => t.completed && t.completedAt?.startsWith(date)).length;
}

function habitCompletionRate(habits: Habit[], days: number): number {
    if (habits.length === 0) return 0;
    let total = 0;
    let done = 0;
    for (let i = 0; i < days; i++) {
        const date = daysAgo(i);
        for (const h of habits) {
            total++;
            if (h.completedDates.includes(date)) done++;
        }
    }
    return total > 0 ? done / total : 0;
}

function getEnergyTrend(reflections: { date: string; stars: number }[], days: number): number[] {
    const ratings: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = daysAgo(i);
        const r = reflections.find(ref => ref.date === date);
        if (r) ratings.push(r.stars);
    }
    return ratings;
}

function trend(values: number[]): 'rising' | 'steady' | 'declining' {
    if (values.length < 2) return 'steady';
    const first = values.slice(0, Math.ceil(values.length / 2));
    const second = values.slice(Math.ceil(values.length / 2));
    const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
    const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
    const diff = avgSecond - avgFirst;
    if (diff > 0.4) return 'rising';
    if (diff < -0.4) return 'declining';
    return 'steady';
}

// ── Local heuristic detectors ────────────────────────────────────────────────

function detectInsights(state: ReturnType<typeof useGameStore.getState>): PulseInsight[] {
    const insights: PulseInsight[] = [];
    const t = today();

    // 1. Energy trend detection
    const energyValues = getEnergyTrend(state.reflectionNotes, 5);
    if (energyValues.length >= 3) {
        const energyTrend = trend(energyValues);
        if (energyTrend === 'declining') {
            insights.push({
                id: 'energy-declining',
                icon: '🔋',
                title: 'Energy dipping',
                description: `Your energy ratings have been declining over the last ${energyValues.length} days. Consider lighter tasks or a rest day.`,
                severity: 'warning',
                domain: 'energy',
                actionLabel: 'Check in',
                actionHref: '/reflection',
            });
        } else if (energyTrend === 'rising' && energyValues[energyValues.length - 1] >= 4) {
            insights.push({
                id: 'energy-rising',
                icon: '⚡',
                title: 'Energy surge',
                description: 'Your energy is trending up! Great time to tackle a Hard or Epic quest.',
                severity: 'celebration',
                domain: 'energy',
                actionLabel: 'Go hard',
                actionHref: '/quests',
            });
        }
    }

    // 2. Quest completion velocity
    const completedToday = countCompletedOnDate(state.tasks, t);
    const completedYesterday = countCompletedOnDate(state.tasks, daysAgo(1));
    const completed2DaysAgo = countCompletedOnDate(state.tasks, daysAgo(2));

    if (completedToday === 0 && completedYesterday === 0 && completed2DaysAgo > 0) {
        insights.push({
            id: 'quest-stall',
            icon: '📉',
            title: 'Quest momentum stalling',
            description: 'No quests completed in 2 days. Even one small win can restart your momentum.',
            severity: 'warning',
            domain: 'quests',
            actionLabel: 'Quick quest',
            actionHref: '/quests',
        });
    }

    if (completedToday >= 5) {
        insights.push({
            id: 'quest-spree',
            icon: '🔥',
            title: 'On a quest spree!',
            description: `${completedToday} quests completed today — absolutely crushing it.`,
            severity: 'celebration',
            domain: 'quests',
        });
    }

    // 3. Habit streak risk
    const habitsAtRisk = state.habits.filter(h => {
        if (h.streak < 3) return false; // only care about established streaks
        return !h.completedDates.includes(t);
    });
    if (habitsAtRisk.length > 0) {
        const names = habitsAtRisk.slice(0, 3).map(h => h.name).join(', ');
        insights.push({
            id: 'habit-streak-risk',
            icon: '🧊',
            title: `${habitsAtRisk.length} streak${habitsAtRisk.length > 1 ? 's' : ''} at risk`,
            description: `${names}${habitsAtRisk.length > 3 ? ` and ${habitsAtRisk.length - 3} more` : ''} — complete before midnight to keep streaks alive.`,
            severity: habitsAtRisk.some(h => h.streak >= 7) ? 'critical' : 'warning',
            domain: 'habits',
            actionLabel: 'Do habits',
            actionHref: '/habits',
        });
    }

    // 4. Habit completion rate trend (7-day vs previous 7-day)
    const recentRate = habitCompletionRate(state.habits, 7);
    const priorRate = habitCompletionRate(state.habits, 14) - recentRate; // approx
    if (state.habits.length > 0 && recentRate < 0.3 && recentRate < priorRate) {
        insights.push({
            id: 'habit-decline',
            icon: '📊',
            title: 'Habit completion dropping',
            description: `Only ${Math.round(recentRate * 100)}% habit completion this week. Too many habits? Consider focusing on your top 3.`,
            severity: 'warning',
            domain: 'habits',
            actionLabel: 'Review habits',
            actionHref: '/habits',
        });
    }

    // 5. Vocab overconfidence detection
    const reviewedWords = state.vocabWords.filter((w: VocabWord) => w.totalReviews >= 3);
    if (reviewedWords.length >= 5) {
        const overconfident = reviewedWords.filter((w: VocabWord) => {
            const accuracy = w.totalReviews > 0 ? w.correctReviews / w.totalReviews : 0;
            return (w.confidenceRating ?? 0) >= 4 && accuracy < 0.6;
        });
        if (overconfident.length >= 2) {
            insights.push({
                id: 'vocab-overconfidence',
                icon: '🎯',
                title: 'Vocab overconfidence detected',
                description: `${overconfident.length} words you feel confident about have <60% accuracy. Quiz practice can close this gap.`,
                severity: 'warning',
                domain: 'vocab',
                actionLabel: 'Take quiz',
                actionHref: '/wordforge',
            });
        }
    }

    // 6. Vocab due pile-up
    const dueCount = state.vocabWords.filter((w: VocabWord) => w.nextReviewDate <= t).length;
    if (dueCount >= 10) {
        insights.push({
            id: 'vocab-pileup',
            icon: '📚',
            title: `${dueCount} vocab words due`,
            description: 'Your review queue is building up. A quick 5-minute session can chip away at it.',
            severity: dueCount >= 20 ? 'warning' : 'info',
            domain: 'vocab',
            actionLabel: 'Review words',
            actionHref: '/wordforge',
        });
    }

    // 7. Focus session frequency
    if (state.focusSessionsTotal > 0) {
        // If we have activity log, check for recent focus
        const lastFocusLog = state.activityLog
            .filter((a) => a.text?.toLowerCase().includes('focus'))
            .slice(-1)[0];
        if (lastFocusLog) {
            const daysSinceFocus = Math.floor((Date.now() - new Date(lastFocusLog.timestamp).getTime()) / 86400000);
            if (daysSinceFocus >= 3) {
                insights.push({
                    id: 'focus-absent',
                    icon: '⏱️',
                    title: `No focus sessions in ${daysSinceFocus} days`,
                    description: 'Focus sessions correlate with higher quest completion. Consider a short session today.',
                    severity: 'info',
                    domain: 'focus',
                    actionLabel: 'Start focus',
                    actionHref: '/focus',
                });
            }
        }
    }

    // 8. Streak milestone celebration
    if ([7, 14, 30, 50, 100].includes(state.streak)) {
        insights.push({
            id: `streak-milestone-${state.streak}`,
            icon: '🏆',
            title: `${state.streak}-day streak milestone!`,
            description: `You've maintained a ${state.streak}-day streak — that's incredible consistency.`,
            severity: 'celebration',
            domain: 'streaks',
        });
    }

    // 9. HP warning (existing guardian mode covers this, but pulse gives context)
    if (state.hp < state.maxHp * 0.25 && state.hp > 0) {
        insights.push({
            id: 'hp-critical',
            icon: '❤️',
            title: 'HP critically low',
            description: `Only ${state.hp}/${state.maxHp} HP remaining. Use a health potion or complete easy quests to recover.`,
            severity: 'critical',
            domain: 'quests',
            actionLabel: 'Inventory',
            actionHref: '/inventory',
        });
    }

    // 10. Hard task avoidance pattern
    const hardTasks = state.tasks.filter(t => !t.completed && (t.difficulty === 'Hard' || t.difficulty === 'Epic'));
    const easyCompletedRecently = state.tasks.filter(t => t.completed && t.difficulty === 'Easy' && t.completedAt && t.completedAt >= daysAgo(3)).length;
    if (hardTasks.length >= 3 && easyCompletedRecently >= 5) {
        insights.push({
            id: 'hard-avoidance',
            icon: '🛡️',
            title: 'Hard quest avoidance?',
            description: `${hardTasks.length} Hard/Epic quests waiting while you've been clearing Easy ones. Try tackling one today.`,
            severity: 'info',
            domain: 'quests',
            actionLabel: 'View quests',
            actionHref: '/quests',
        });
    }

    // Sort: critical first, then warnings, then celebrations, then info
    const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, celebration: 2, info: 3 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return insights;
}

// ── Compressed state snapshot for AI call ────────────────────────────────────

export function buildPulseSnapshot(state: ReturnType<typeof useGameStore.getState>): Record<string, unknown> {
    const t = today();
    const completedToday = state.tasks.filter(tk => tk.completed && tk.completedAt?.startsWith(t)).length;
    const habitsToday = state.habits.filter(h => h.completedDates.includes(t)).length;
    const energyRatings = getEnergyTrend(state.reflectionNotes, 7);
    const recentReflections = state.reflectionNotes.slice(-5).map(r => ({
        date: r.date,
        stars: r.stars,
        note: r.note?.slice(0, 80),
    }));

    // Weekly quest counts
    const weeklyQuests: number[] = [];
    for (let i = 6; i >= 0; i--) {
        weeklyQuests.push(countCompletedOnDate(state.tasks, daysAgo(i)));
    }

    const vocabStats = {
        total: state.vocabWords.length,
        mastered: state.vocabWords.filter((w: VocabWord) => w.status === 'mastered').length,
        due: state.vocabWords.filter((w: VocabWord) => w.nextReviewDate <= t).length,
        avgAccuracy: state.vocabWords.length > 0
            ? Math.round(state.vocabWords.reduce((sum: number, w: VocabWord) =>
                sum + (w.totalReviews > 0 ? w.correctReviews / w.totalReviews : 0), 0) / state.vocabWords.length * 100)
            : 0,
    };

    return {
        player: {
            name: state.characterName || 'Adventurer',
            level: state.level,
            class: state.characterClass,
            streak: state.streak,
            hp: state.hp,
            maxHp: state.maxHp,
        },
        todayStats: {
            questsCompleted: completedToday,
            habitsCompleted: habitsToday,
            totalHabits: state.habits.length,
            energy: state.todayEnergyRating,
        },
        weeklyQuestCounts: weeklyQuests,
        energyTrend: energyRatings,
        recentReflections,
        habitStreaks: state.habits.slice(0, 8).map(h => ({
            name: h.name,
            streak: h.streak,
            longestStreak: h.longestStreak,
            doneToday: h.completedDates.includes(t),
        })),
        pendingQuests: {
            easy: state.tasks.filter(tk => !tk.completed && tk.difficulty === 'Easy').length,
            medium: state.tasks.filter(tk => !tk.completed && tk.difficulty === 'Medium').length,
            hard: state.tasks.filter(tk => !tk.completed && tk.difficulty === 'Hard').length,
            epic: state.tasks.filter(tk => !tk.completed && tk.difficulty === 'Epic').length,
        },
        vocab: vocabStats,
        focusSessions: state.focusSessionsTotal,
        focusMinutes: state.focusMinutesTotal,
        activeGoals: state.goals.filter(g => !g.completed).length,
    };
}

// ── Cache key ────────────────────────────────────────────────────────────────

const AI_CACHE_KEY = 'nexus-pulse-ai';

interface CachedSynthesis {
    data: AISynthesis;
    date: string;
}

function getCachedSynthesis(): AISynthesis | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AI_CACHE_KEY);
        if (!raw) return null;
        const cached: CachedSynthesis = JSON.parse(raw);
        if (cached.date === today()) return cached.data;
        return null; // expired (different day)
    } catch {
        return null;
    }
}

function setCachedSynthesis(data: AISynthesis): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ data, date: today() }));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNexusPulse(): NexusPulseData {
    const state = useGameStore();
    const [aiSynthesis, setAISynthesis] = useState<AISynthesis | null>(() => getCachedSynthesis());
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const fetchingRef = useRef(false);

    // Compute local insights (runs on every render, but cheap — no API)
    const insights = useMemo(() => {
        const fullState = useGameStore.getState();
        return detectInsights(fullState);
    }, [
        state.tasks, state.habits, state.reflectionNotes,
        state.vocabWords, state.streak, state.hp,
        state.focusSessionsTotal, state.activityLog,
        state.goals,
    ]);

    const lastAIRefresh = useMemo(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(AI_CACHE_KEY);
            if (!raw) return null;
            const cached: CachedSynthesis = JSON.parse(raw);
            return cached.date;
        } catch {
            return null;
        }
    }, [aiSynthesis]);

    const refreshAI = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setIsLoadingAI(true);
        try {
            const snapshot = buildPulseSnapshot(useGameStore.getState());
            const res = await fetch('/api/nexus-pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot }),
            });
            if (!res.ok) throw new Error('AI unavailable');
            const data: AISynthesis = await res.json();
            setAISynthesis(data);
            setCachedSynthesis(data);
        } catch (err) {
            console.error('[NexusPulse] AI refresh failed:', err);
        } finally {
            setIsLoadingAI(false);
            fetchingRef.current = false;
        }
    }, []);

    return { insights, aiSynthesis, isLoadingAI, refreshAI, lastAIRefresh };
}
