'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore, Task, Habit, VocabWord } from '@/store/useGameStore';
import { logger } from '@/lib/logger';
import { VOCAB_MASTERY_BOSS_STEP, VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS } from '@/lib/rewardCalculator';

// ────────────────────────────────────────────────────────────────────────────
// Nexus Pulse — Client-side heuristic engine + event-driven AI synthesis
//
// Local heuristic detectors run on every render (free, instant).
// AI synthesis refreshes on meaningful events with a 5-minute cooldown.
// Historical snapshots are stored for week-over-week trend analysis.
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

// Event types that trigger an AI refresh
export type PulseEvent =
    | 'quest_batch_complete'   // 3+ quests completed in a session
    | 'reflection_submitted'   // after daily reflection
    | 'habit_streak_broken'    // a streak was lost
    | 'boss_resolved'          // boss battle won or lost
    | 'vocab_quiz_done'        // after completing a quiz session
    | 'manual_refresh';        // user clicked refresh

export interface NexusPulseData {
    insights: PulseInsight[];
    aiSynthesis: AISynthesis | null;
    isLoadingAI: boolean;
    refreshAI: () => Promise<void>;
    triggerEvent: (event: PulseEvent) => void;
    lastAIRefresh: string | null;
    insightsForDomain: (domain: InsightDomain) => PulseInsight[];
}

// ── History types ────────────────────────────────────────────────────────────

export interface PulseHistoryEntry {
    date: string;
    synthesis: AISynthesis;
    snapshot: Record<string, unknown>;
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

    // 11. Cognitive load detection — too many new words without enough reviews
    const newWords = state.vocabWords.filter((w: VocabWord) => w.status === 'new');
    const learningWords = state.vocabWords.filter((w: VocabWord) => w.status === 'learning');
    const totalActive = newWords.length + learningWords.length;
    if (totalActive >= 15) {
        insights.push({
            id: 'vocab-cognitive-overload',
            icon: '🧠',
            title: 'Cognitive overload risk',
            description: `You have ${totalActive} words in new/learning status. Focus on reviewing existing words before adding more — your brain needs time to consolidate.`,
            severity: totalActive >= 25 ? 'critical' : 'warning',
            domain: 'vocab',
            actionLabel: 'Review words',
            actionHref: '/wordforge',
        });
    } else if (totalActive >= 8 && dueCount >= 5) {
        insights.push({
            id: 'vocab-review-before-new',
            icon: '📝',
            title: 'Review before adding new words',
            description: `${dueCount} words due for review and ${totalActive} still in learning phase. Clear your review queue first for better retention.`,
            severity: 'info',
            domain: 'vocab',
            actionLabel: 'Start review',
            actionHref: '/wordforge',
        });
    }

    // 12. Declining vocab accuracy trend
    const recentlyReviewed = state.vocabWords
        .filter((w: VocabWord) => w.totalReviews >= 2 && w.lastReviewed && w.lastReviewed >= daysAgo(7))
        .slice(0, 20);
    if (recentlyReviewed.length >= 5) {
        const avgAccuracy = recentlyReviewed.reduce((sum: number, w: VocabWord) =>
            sum + (w.totalReviews > 0 ? w.correctReviews / w.totalReviews : 0), 0) / recentlyReviewed.length;
        if (avgAccuracy < 0.5) {
            insights.push({
                id: 'vocab-accuracy-low',
                icon: '📉',
                title: 'Vocab accuracy dropping',
                description: `Only ${Math.round(avgAccuracy * 100)}% accuracy on recently reviewed words. Try using mnemonics or slowing down during reviews.`,
                severity: 'warning',
                domain: 'vocab',
                actionLabel: 'Practice mode',
                actionHref: '/wordforge',
            });
        }
    }

    // 13. Vocab mastery celebration + boss buff nudge
    const masteredCount = state.vocabWords.filter((w: VocabWord) => w.status === 'mastered').length;
    const currentBossSteps = Math.floor(masteredCount / VOCAB_MASTERY_BOSS_STEP);
    const nextMilestone = (currentBossSteps + 1) * VOCAB_MASTERY_BOSS_STEP;
    const currentBonus = Math.min(currentBossSteps * VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS);
    const wordsToNextBonus = nextMilestone - masteredCount;

    if (masteredCount > 0 && currentBonus < VOCAB_MASTERY_BOSS_MAX_BONUS && wordsToNextBonus <= 2) {
        insights.push({
            id: 'vocab-boss-buff-close',
            icon: '⚔️',
            title: `${wordsToNextBonus} word${wordsToNextBonus !== 1 ? 's' : ''} from next boss buff`,
            description: `Master ${wordsToNextBonus} more word${wordsToNextBonus !== 1 ? 's' : ''} to unlock +${Math.round((currentBonus + VOCAB_MASTERY_BOSS_BONUS_PER_STEP) * 100)}% boss damage. Knowledge is power!`,
            severity: 'info',
            domain: 'cross-domain',
            actionLabel: 'Review words',
            actionHref: '/wordforge',
        });
    }
    if ([5, 10, 25, 50].includes(masteredCount)) {
        insights.push({
            id: `vocab-mastery-milestone-${masteredCount}`,
            icon: '📖',
            title: `${masteredCount} words mastered!`,
            description: `Your vocabulary mastery grants +${Math.round(currentBonus * 100)}% bonus boss damage. Scholar power!`,
            severity: 'celebration',
            domain: 'cross-domain',
        });
    }

    // 14. Vocab streak nudge — encourage daily reviews
    if (state.vocabWords.length > 0 && state.vocabStreak === 0 && dueCount > 0) {
        insights.push({
            id: 'vocab-streak-start',
            icon: '🔤',
            title: 'Start a vocab streak',
            description: `You have ${dueCount} words waiting for review. Review today to start building a vocab streak!`,
            severity: 'info',
            domain: 'vocab',
            actionLabel: 'Review now',
            actionHref: '/wordforge',
        });
    }

    // 15. No words yet — onboarding nudge
    if (state.vocabWords.length === 0) {
        insights.push({
            id: 'vocab-onboarding',
            icon: '📚',
            title: 'Unlock WordForge',
            description: 'Generate your first vocabulary words to start earning boss damage bonuses through mastery!',
            severity: 'info',
            domain: 'vocab',
            actionLabel: 'Get started',
            actionHref: '/wordforge',
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

    const masteredWords = state.vocabWords.filter((w: VocabWord) => w.status === 'mastered').length;
    const bossSteps = Math.floor(masteredWords / VOCAB_MASTERY_BOSS_STEP);
    const bossBonus = Math.min(bossSteps * VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS);
    const vocabStats = {
        total: state.vocabWords.length,
        mastered: masteredWords,
        new: state.vocabWords.filter((w: VocabWord) => w.status === 'new').length,
        learning: state.vocabWords.filter((w: VocabWord) => w.status === 'learning').length,
        due: state.vocabWords.filter((w: VocabWord) => w.nextReviewDate <= t).length,
        avgAccuracy: state.vocabWords.length > 0
            ? Math.round(state.vocabWords.reduce((sum: number, w: VocabWord) =>
                sum + (w.totalReviews > 0 ? w.correctReviews / w.totalReviews : 0), 0) / state.vocabWords.length * 100)
            : 0,
        bossBuffPercent: Math.round(bossBonus * 100),
        vocabStreak: state.vocabStreak,
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

// ── Cache & History ──────────────────────────────────────────────────────────

const AI_CACHE_KEY = 'nexus-pulse-ai';
const HISTORY_KEY = 'nexus-pulse-history';
const COOLDOWN_MS = 5 * 60 * 1000; // 5-minute minimum between AI calls

interface CachedSynthesis {
    data: AISynthesis;
    date: string;
    timestamp: number; // epoch ms for cooldown tracking
}

// Cache the parsed localStorage entry in memory to avoid repeated
// getItem + JSON.parse calls on every render / cooldown check.
let _cachedEntry: CachedSynthesis | null = null;
let _cachedRaw: string | null = null; // tracks the raw string to detect external changes

function _loadCacheEntry(): CachedSynthesis | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AI_CACHE_KEY);
        if (!raw) { _cachedEntry = null; _cachedRaw = null; return null; }
        // Only re-parse if the raw string changed
        if (raw !== _cachedRaw) {
            _cachedRaw = raw;
            _cachedEntry = JSON.parse(raw);
        }
        return _cachedEntry;
    } catch {
        _cachedEntry = null;
        _cachedRaw = null;
        return null;
    }
}

function getCachedSynthesis(): AISynthesis | null {
    const cached = _loadCacheEntry();
    if (!cached) return null;
    // Cache is valid within the same day
    return cached.date === today() ? cached.data : null;
}

function getCacheTimestamp(): number {
    const cached = _loadCacheEntry();
    return cached?.timestamp || 0;
}

function setCachedSynthesis(data: AISynthesis): void {
    if (typeof window === 'undefined') return;
    const entry: CachedSynthesis = { data, date: today(), timestamp: Date.now() };
    const raw = JSON.stringify(entry);
    localStorage.setItem(AI_CACHE_KEY, raw);
    // Update in-memory cache immediately
    _cachedEntry = entry;
    _cachedRaw = raw;
}

function isCooldownActive(): boolean {
    return Date.now() - getCacheTimestamp() < COOLDOWN_MS;
}

// ── History (Feature #4) ─────────────────────────────────────────────────────

export function getPulseHistory(): PulseHistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function appendHistory(synthesis: AISynthesis, snapshot: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    try {
        const history = getPulseHistory();
        const todayDate = today();
        // Replace today's entry if it exists, otherwise append
        const idx = history.findIndex(h => h.date === todayDate);
        const entry: PulseHistoryEntry = { date: todayDate, synthesis, snapshot };
        if (idx >= 0) {
            history[idx] = entry;
        } else {
            history.push(entry);
        }
        // Keep last 30 days
        const trimmed = history.slice(-30);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch { /* storage full — ignore */ }
}

// ── Exported helpers for other systems ───────────────────────────────────────

/** Get the cached AI synthesis for injection into other AI routes.
 *  Call this in fetch handlers to include pulse context in POST body. */
export function getCachedPulseForAPI(): AISynthesis | null {
    return getCachedSynthesis();
}

/** Convenience: get pulse data as a plain object for JSON.stringify in API calls */
export function getPulseDataForRoute(): Record<string, unknown> | null {
    const synthesis = getCachedSynthesis();
    if (!synthesis) return null;
    return {
        topInsight: synthesis.topInsight,
        burnoutRisk: synthesis.burnoutRisk,
        momentum: synthesis.momentum,
        suggestion: synthesis.suggestion,
    };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNexusPulse(): NexusPulseData {
    const state = useGameStore();
    const [aiSynthesis, setAISynthesis] = useState<AISynthesis | null>(() => getCachedSynthesis());
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const fetchingRef = useRef(false);

    // Track previous values for event detection
    const prevTaskCountRef = useRef(state.tasks.filter(t => t.completed).length);
    const prevReflectionCountRef = useRef(state.reflectionNotes.length);
    const prevStreakRef = useRef(state.streak);

    // Compute local insights (runs on every render, but cheap — no API)
    // Cheap local heuristic — no API call, safe to recompute on any state change
    const insights = useMemo(() => detectInsights(state), [state]);

    // Domain-specific insight filter for page-level components
    const insightsForDomain = useCallback((domain: InsightDomain) => {
        return insights.filter(i => i.domain === domain);
    }, [insights]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiSynthesis]);

    const refreshAI = useCallback(async (force = false) => {
        if (fetchingRef.current) return;
        // Respect cooldown unless forced (manual refresh)
        if (!force && isCooldownActive()) return;
        fetchingRef.current = true;
        setIsLoadingAI(true);
        try {
            const snapshot = buildPulseSnapshot(useGameStore.getState());
            const history = getPulseHistory().slice(-7);
            const res = await fetch('/api/nexus-pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot, history }),
                signal: AbortSignal.timeout(30000),
            });
            if (!res.ok) throw new Error('AI unavailable');
            const data: AISynthesis = await res.json();
            setAISynthesis(data);
            setCachedSynthesis(data);
            appendHistory(data, snapshot);
        } catch (err) {
            logger.error('AI refresh failed', 'NexusPulse', err);
        } finally {
            setIsLoadingAI(false);
            fetchingRef.current = false;
        }
    }, []);

    // Event-driven trigger function
    const triggerEvent = useCallback((event: PulseEvent) => {
        const force = event === 'manual_refresh';
        logger.info(`Event: ${event}`, 'NexusPulse');
        refreshAI(force);
    }, [refreshAI]);

    // Auto-detect meaningful state changes and trigger refresh
    useEffect(() => {
        const completedNow = state.tasks.filter(t => t.completed).length;
        const delta = completedNow - prevTaskCountRef.current;
        prevTaskCountRef.current = completedNow;
        // Trigger on batch quest completion (3+ in this render cycle)
        if (delta >= 3) {
            triggerEvent('quest_batch_complete');
        }
    }, [state.tasks, triggerEvent]);

    useEffect(() => {
        const count = state.reflectionNotes.length;
        if (count > prevReflectionCountRef.current) {
            prevReflectionCountRef.current = count;
            triggerEvent('reflection_submitted');
        }
    }, [state.reflectionNotes.length, triggerEvent]);

    useEffect(() => {
        if (state.streak < prevStreakRef.current && prevStreakRef.current > 0) {
            triggerEvent('habit_streak_broken');
        }
        prevStreakRef.current = state.streak;
    }, [state.streak, triggerEvent]);

    return { insights, aiSynthesis, isLoadingAI, refreshAI: () => refreshAI(true), triggerEvent, lastAIRefresh, insightsForDomain };
}
