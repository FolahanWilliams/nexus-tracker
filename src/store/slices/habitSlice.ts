import type { StateCreator } from 'zustand';
import type { GameState, HabitSlice, Habit } from '../types';
import { validateHabitName, ValidationError } from '@/lib/validation';
import {
    HABIT_COMPLETED_DATES_MAX,
    HABIT_SM2_DEFAULT_EASE,
    HABIT_SM2_MIN_EASE,
    HABIT_SM2_MAX_EASE,
    HABIT_SM2_MAX_INTERVAL,
} from '@/lib/constants';
import { logger } from '@/lib/logger';

const today = () => new Date().toISOString().split('T')[0];

/** Compute next focus date using SM-2-like algorithm for habits. */
function computeHabitSchedule(habit: Habit, completed: boolean): Pick<Habit, 'habitEase' | 'habitInterval' | 'habitReps' | 'nextFocusDate' | 'totalMisses'> {
    let ease = habit.habitEase ?? HABIT_SM2_DEFAULT_EASE;
    let reps = habit.habitReps ?? 0;
    let interval = habit.habitInterval ?? 1;
    let misses = habit.totalMisses ?? 0;

    if (completed) {
        // Successful completion — increase interval (habit is becoming automatic)
        reps += 1;
        // SM-2 ease adjustment (quality=4 for on-time completion)
        ease = Math.min(HABIT_SM2_MAX_EASE, Math.max(HABIT_SM2_MIN_EASE,
            ease + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02))
        ));
        if (reps === 1) interval = 1;
        else if (reps === 2) interval = 2;
        else interval = Math.min(HABIT_SM2_MAX_INTERVAL, Math.round(interval * ease));
    } else {
        // Missed — decrease interval (needs more frequent reminders)
        misses += 1;
        // SM-2 ease adjustment (quality=1 for miss)
        ease = Math.max(HABIT_SM2_MIN_EASE,
            ease + (0.1 - (5 - 1) * (0.08 + (5 - 1) * 0.02))
        );
        reps = 0;
        interval = 1; // Reset to daily reminders
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);

    return {
        habitEase: ease,
        habitInterval: interval,
        habitReps: reps,
        nextFocusDate: nextDate.toISOString().split('T')[0],
        totalMisses: misses,
    };
}

export const createHabitSlice: StateCreator<GameState, [], [], HabitSlice> = (set, get) => ({
    // ── State ──
    habits: [],

    // ── Actions ──
    addHabit: (name, icon, category, xpReward) => {
        try {
            const validatedName = validateHabitName(name);
            const todayStr = today();
            const newHabit: Habit = {
                id: crypto.randomUUID(),
                name: validatedName,
                icon: icon.slice(0, 10),
                category,
                xpReward,
                streak: 0,
                longestStreak: 0,
                completedDates: [],
                createdAt: new Date().toISOString(),
                lastCompletedDate: null,
                // SM-2 defaults
                habitEase: HABIT_SM2_DEFAULT_EASE,
                habitInterval: 1,
                habitReps: 0,
                nextFocusDate: todayStr,
                totalMisses: 0,
            };
            set((state) => ({ habits: [...state.habits, newHabit] }));
        } catch (error) {
            if (error instanceof ValidationError) logger.error(`Validation error: ${error.message}`, 'store');
            throw error;
        }
    },

    completeHabit: (habitId) => {
        const todayStr = today();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const habit = get().habits.find(h => h.id === habitId);
        if (!habit || habit.completedDates.includes(todayStr)) return;

        const newStreak = habit.lastCompletedDate === yesterdayStr ? habit.streak + 1 : 1;
        const newLongest = Math.max(newStreak, habit.longestStreak);

        // Update SM-2 schedule on completion
        const schedule = computeHabitSchedule(habit, true);

        set((state) => ({
            habits: state.habits.map(h =>
                h.id === habitId
                    ? {
                        ...h,
                        completedDates: [...h.completedDates, todayStr].slice(-HABIT_COMPLETED_DATES_MAX),
                        streak: newStreak,
                        longestStreak: newLongest,
                        lastCompletedDate: todayStr,
                        ...schedule,
                    }
                    : h
            )
        }));

        get().addXP(habit.xpReward);
        get().addGold(Math.ceil(habit.xpReward / 5));
        get().logActivity('habit_complete', habit.icon || '✅', `Completed habit "${habit.name}"`, `${newStreak}-day streak, +${habit.xpReward} XP`);
    },

    deleteHabit: (habitId) => {
        set((state) => ({ habits: state.habits.filter(h => h.id !== habitId) }));
    },

    restoreHabit: (habit) => {
        set((state) => ({ habits: [...state.habits, habit] }));
    },

    checkHabitResets: () => {
        const todayStr = today();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        set((state) => ({
            habits: state.habits.map(habit => {
                if (habit.streak > 0 && habit.lastCompletedDate !== todayStr && habit.lastCompletedDate !== yesterdayStr) {
                    // Missed — update SM-2 schedule to increase reminder frequency
                    const schedule = computeHabitSchedule(habit, false);
                    return { ...habit, streak: 0, ...schedule };
                }
                return habit;
            })
        }));
    },
});
