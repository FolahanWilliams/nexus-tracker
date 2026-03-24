'use client';

import { useMemo } from 'react';
import { useGameStore, Habit } from '@/store/useGameStore';

export interface HabitRecommendation {
    habit: Habit;
    /** Priority score (lower = more urgent). Based on SM-2 schedule + streak risk. */
    priority: number;
    /** Reason for recommendation. */
    reason: string;
    /** Whether the habit is overdue (past nextFocusDate). */
    overdue: boolean;
}

/**
 * Returns habits sorted by smart SM-2 priority.
 * Habits that are overdue for focus get highest priority;
 * habits with long intervals (becoming automatic) get lowest.
 */
export function useHabitScheduler(): {
    recommendations: HabitRecommendation[];
    overdueCount: number;
    focusHabits: HabitRecommendation[];
} {
    const habits = useGameStore((s) => s.habits);

    // Compute today's date string outside useMemo to satisfy purity rules
    const todayStr = new Date().toISOString().split('T')[0];
    const nowMs = new Date(todayStr).getTime(); // midnight today, stable per render

    return useMemo(() => {
        const recommendations: HabitRecommendation[] = habits.map((habit) => {
            const doneToday = habit.completedDates.includes(todayStr);
            const nextFocus = habit.nextFocusDate || todayStr;
            const overdue = nextFocus <= todayStr && !doneToday;
            const daysPastDue = overdue
                ? Math.max(0, (nowMs - new Date(nextFocus).getTime()) / 86400000)
                : 0;

            // Priority scoring (lower = more urgent)
            let priority = 100;
            let reason = '';

            if (doneToday) {
                priority = 999; // Already done — lowest priority
                reason = 'Completed today';
            } else if (overdue && habit.streak >= 3) {
                // High-streak habit that's overdue — critical
                priority = 1 + daysPastDue * -1;
                reason = `${habit.streak}-day streak at risk — overdue by ${Math.ceil(daysPastDue)} day${daysPastDue >= 2 ? 's' : ''}`;
            } else if (overdue) {
                // Overdue but low streak
                priority = 10 - daysPastDue;
                reason = `Scheduled for focus today`;
            } else if (habit.totalMisses > 3 && !doneToday) {
                // Frequently missed habit — needs attention
                priority = 15;
                reason = `Frequently missed (${habit.totalMisses} times) — needs reinforcement`;
            } else {
                // Not due yet — calculate days until due
                const daysUntilDue = Math.max(0,
                    (new Date(nextFocus).getTime() - nowMs) / 86400000
                );
                priority = 50 + daysUntilDue;
                reason = `Next focus in ${Math.ceil(daysUntilDue)} day${daysUntilDue >= 2 ? 's' : ''}`;
            }

            return { habit, priority, reason, overdue };
        });

        // Sort by priority (lowest = most urgent)
        recommendations.sort((a, b) => a.priority - b.priority);

        const overdueCount = recommendations.filter(r => r.overdue).length;
        const focusHabits = recommendations.filter(r => r.overdue || r.priority < 20);

        return { recommendations, overdueCount, focusHabits };
    }, [habits, todayStr, nowMs]);
}
