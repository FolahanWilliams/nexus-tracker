/**
 * Unified player narrative builder for Hoot AI.
 *
 * Replaces raw JSON dumps with a structured, human-readable narrative that
 * gives Gemini deep cross-domain awareness of the player's state, history,
 * and behavioral patterns.
 */

import type { GameState, HootMemory } from '@/store/types';
import { buildPulseSnapshot } from '@/hooks/useNexusPulse';
import { VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS } from '@/lib/rewardCalculator';

export function buildPlayerNarrative(state: GameState, pathname: string): string {
    const today = new Date().toISOString().split('T')[0];
    const sections: string[] = [];

    // ── Identity ──────────────────────────────────────────────────
    sections.push(`=== PLAYER IDENTITY ===
Name: ${state.characterName || 'Adventurer'}
Class: ${state.characterClass || 'Not chosen'} | Title: ${state.title}
Level: ${state.level} | XP: ${state.xp} | Gold: ${state.gold} | Gems: ${state.gems}
HP: ${state.hp}/${state.maxHp}
Motto: "${state.characterMotto}"
Strengths: ${state.characterStrengths}`);

    // ── Streaks & Momentum ────────────────────────────────────────
    const doneToday = state.tasks.filter(t => t.completed && t.completedAt?.startsWith(today)).length;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const doneThisWeek = state.tasks.filter(t => t.completed && t.completedAt && t.completedAt >= weekAgo).length;
    const activeTaskCount = state.tasks.filter(t => !t.completed).length;
    const todayHabitsDone = state.habits.filter(h => h.completedDates.includes(today)).length;

    sections.push(`=== MOMENTUM ===
Task Streak: ${state.streak} days | Login Streak: ${state.loginStreak} days
Today: ${doneToday} quests done, ${todayHabitsDone}/${state.habits.length} habits done
This Week: ${doneThisWeek} quests completed | ${activeTaskCount} active quests`);

    // ── Page-specific context ─────────────────────────────────────
    const pageCtx = buildPageContext(state, pathname, today);
    if (pageCtx) sections.push(pageCtx);

    // ── Cross-domain correlations ─────────────────────────────────
    const correlations = buildCorrelations(state, today);
    if (correlations) sections.push(correlations);

    // ── Nexus Pulse snapshot (compressed) ─────────────────────────
    try {
        const pulse = buildPulseSnapshot(state);
        const pending = pulse.pendingQuests as Record<string, number>;
        const vocab = pulse.vocab as Record<string, number>;
        sections.push(`=== NEXUS PULSE ===
Weekly quest trend: ${(pulse.weeklyQuestCounts as number[]).join(', ')}
Energy trend: ${(pulse.energyTrend as number[]).join(', ') || 'No data'}
Pending: E=${pending.easy} M=${pending.medium} H=${pending.hard} Ep=${pending.epic}
Vocab: ${vocab.total} total, ${vocab.mastered} mastered, ${vocab.due} due, ${vocab.avgAccuracy}% accuracy
Focus: ${pulse.focusSessions} sessions, ${pulse.focusMinutes} min total
Active goals: ${pulse.activeGoals}`);

        // Cached AI synthesis
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('nexus-pulse-ai');
                if (cached) {
                    const { data } = JSON.parse(cached);
                    if (data?.topInsight) sections.push(`AI Pulse Insight: ${data.topInsight}`);
                    if (data?.suggestion) sections.push(`AI Suggestion: ${data.suggestion}`);
                }
            } catch { /* ignore */ }
        }
    } catch { /* pulse snapshot is optional */ }

    // ── Memory context ────────────────────────────────────────────
    const memoryCtx = buildMemoryContext(state.hootMemory);
    if (memoryCtx) sections.push(memoryCtx);

    return sections.join('\n\n');
}

function buildPageContext(state: GameState, pathname: string, today: string): string | null {
    switch (pathname) {
        case '/':
        case '/quests': {
            const active = state.tasks.filter(t => !t.completed);
            const hard = active.filter(t => t.difficulty === 'Hard' || t.difficulty === 'Epic');
            return `=== PAGE: QUESTS ===
Active (${active.length}): ${active.slice(0, 8).map(t => `${t.title} [${t.difficulty}/${t.category}]`).join(', ') || 'None'}
${hard.length > 0 ? `Hard/Epic: ${hard.map(t => t.title).join(', ')}` : ''}`;
        }
        case '/habits': {
            const habitsInfo = state.habits.map(h => ({
                name: h.name,
                done: h.completedDates.includes(today),
                streak: h.streak,
                longest: h.longestStreak,
            }));
            return `=== PAGE: HABITS ===
${habitsInfo.map(h => `${h.done ? '✅' : '⬜'} ${h.name} (streak: ${h.streak}, best: ${h.longest})`).join('\n') || 'No habits yet'}`;
        }
        case '/goals': {
            const active = state.goals.filter(g => !g.completed);
            return `=== PAGE: GOALS ===
${active.map(g => `${g.title} [${g.timeframe}] — ${g.milestones.filter(m => m.completed).length}/${g.milestones.length} milestones, due ${g.targetDate}`).join('\n') || 'No active goals'}`;
        }
        case '/reflection': {
            const recent = state.reflectionNotes.slice(-5);
            return `=== PAGE: REFLECTION ===
Energy today: ${state.todayEnergyRating || 'Not set'}
Intention: "${state.todayIntention || 'Not set'}"
Recent reflections:\n${recent.map(r => `  ${r.date}: ${r.stars}★ "${r.note}"`).join('\n') || '  None yet'}`;
        }
        case '/bosses': {
            const active = state.bossBattles.find(b => !b.completed && !b.failed);
            if (!active) return `=== PAGE: BOSSES ===\nNo active boss battle.`;
            const vocabMastered = state.vocabWords.filter(w => w.status === 'mastered').length;
            const steps = Math.floor(vocabMastered / VOCAB_MASTERY_BOSS_STEP);
            const bonus = Math.min(steps * VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS);
            return `=== PAGE: BOSSES ===
Boss: ${active.name} (${active.hp}/${active.maxHp} HP) [${active.difficulty}]
Rewards: ${active.xpReward} XP, ${active.goldReward}g${active.itemReward ? `, ${active.itemReward.name}` : ''}
Vocab mastery bonus: +${Math.round(bonus * 100)}% boss damage`;
        }
        case '/wordforge': {
            const due = state.vocabWords.filter(w => w.nextReviewDate <= today).length;
            const byStatus = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
            state.vocabWords.forEach(w => { byStatus[w.status]++; });
            return `=== PAGE: WORDFORGE ===
Total: ${state.vocabWords.length} | New: ${byStatus.new} | Learning: ${byStatus.learning} | Reviewing: ${byStatus.reviewing} | Mastered: ${byStatus.mastered}
Due for review: ${due} | Vocab streak: ${state.vocabStreak} days
Level: ${state.vocabCurrentLevel}`;
        }
        case '/focus':
            return `=== PAGE: FOCUS ===
Sessions: ${state.focusSessionsTotal} | Minutes: ${state.focusMinutesTotal}
Timer running: ${state.isFocusTimerRunning ? 'Yes' : 'No'}`;
        case '/character':
            return `=== PAGE: CHARACTER ===
Class: ${state.characterClass || 'Not chosen'} | Title: ${state.title}
Achievements: ${state.achievements.length} unlocked, ${state.dynamicAchievements.length} dynamic`;
        case '/inventory': {
            const equipped = [
                state.equippedItems?.weapon?.name,
                state.equippedItems?.armor?.name,
                state.equippedItems?.accessory?.name,
            ].filter(Boolean);
            const consumables = state.inventory.filter(i => i.usable || i.consumableEffect);
            return `=== PAGE: INVENTORY ===
Items: ${state.inventory.length} | Equipped: ${equipped.join(', ') || 'Nothing'}
Consumables: ${consumables.map(c => `${c.name} x${c.quantity}`).join(', ') || 'None'}`;
        }
        case '/shop': {
            const affordable = state.shopItems.filter(r => !r.purchased && r.cost <= state.gold);
            return `=== PAGE: SHOP ===
Gold: ${state.gold} | Affordable items: ${affordable.map(r => `${r.name} (${r.cost}g)`).join(', ') || 'None'}`;
        }
        default:
            return null;
    }
}

function buildCorrelations(state: GameState, today: string): string | null {
    const insights: string[] = [];

    // Vocab + Boss synergy
    const vocabMastered = state.vocabWords.filter(w => w.status === 'mastered').length;
    const activeBoss = state.bossBattles.find(b => !b.completed && !b.failed);
    if (activeBoss && vocabMastered > 0) {
        const steps = Math.floor(vocabMastered / VOCAB_MASTERY_BOSS_STEP);
        const bonus = Math.min(steps * VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS);
        const nextThreshold = (steps + 1) * VOCAB_MASTERY_BOSS_STEP;
        if (bonus < VOCAB_MASTERY_BOSS_MAX_BONUS) {
            insights.push(`Master ${nextThreshold - vocabMastered} more vocab words to increase boss damage to +${Math.round((bonus + VOCAB_MASTERY_BOSS_BONUS_PER_STEP) * 100)}%`);
        }
    }

    // Habit streak risk
    const habitsAtRisk = state.habits.filter(h => h.streak >= 3 && !h.completedDates.includes(today));
    if (habitsAtRisk.length > 0) {
        insights.push(`${habitsAtRisk.length} habit streak(s) at risk today: ${habitsAtRisk.map(h => `${h.name} (${h.streak}d)`).join(', ')}`);
    }

    // Goal deadline proximity
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const urgentGoals = state.goals.filter(g => !g.completed && g.targetDate <= nextWeek);
    if (urgentGoals.length > 0) {
        insights.push(`Goal deadlines within 7 days: ${urgentGoals.map(g => g.title).join(', ')}`);
    }

    // Energy trend
    const recentEnergy = state.reflectionNotes.slice(-5);
    if (recentEnergy.length >= 3) {
        const avg = recentEnergy.reduce((s, r) => s + r.stars, 0) / recentEnergy.length;
        if (avg <= 2) insights.push(`Average energy is low (${avg.toFixed(1)}/5) — suggest lighter workload`);
        else if (avg >= 4) insights.push(`Energy has been high (${avg.toFixed(1)}/5) — great time for ambitious tasks`);
    }

    // Vocab review backlog
    const dueVocab = state.vocabWords.filter(w => w.nextReviewDate <= today).length;
    if (dueVocab >= 15) {
        insights.push(`${dueVocab} vocab words overdue for review — memory retention declining`);
    }

    if (insights.length === 0) return null;
    return `=== CROSS-DOMAIN INSIGHTS ===\n${insights.map(i => `• ${i}`).join('\n')}`;
}

function buildMemoryContext(memory: HootMemory): string | null {
    const parts: string[] = [];

    if (memory.notes.length > 0) {
        const recentNotes = memory.notes.slice(0, 10);
        parts.push(`Memory Notes (${memory.notes.length} total):\n${recentNotes.map(n => `  [${n.category}] ${n.text}`).join('\n')}`);
    }

    if (memory.summaries.length > 0) {
        const recentSummaries = memory.summaries.slice(0, 3);
        parts.push(`Recent Session Summaries:\n${recentSummaries.map(s => `  ${s.date}: ${s.summary} (topics: ${s.topics.join(', ')})`).join('\n')}`);
    }

    if (parts.length === 0) return null;
    return `=== HOOT MEMORY ===\n${parts.join('\n')}`;
}
