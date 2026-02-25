import type { StateCreator } from 'zustand';
import type { GameState, HabitSlice, Habit } from '../types';
import { validateHabitName, ValidationError } from '@/lib/validation';

export const createHabitSlice: StateCreator<GameState, [], [], HabitSlice> = (set, get) => ({
    // ── State ──
    habits: [],

    // ── Actions ──
    addHabit: (name, icon, category, xpReward) => {
        try {
            const validatedName = validateHabitName(name);
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
            };
            set((state) => ({ habits: [...state.habits, newHabit] }));
        } catch (error) {
            if (error instanceof ValidationError) console.error('Validation error:', error.message);
            throw error;
        }
    },

    completeHabit: (habitId) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const habit = get().habits.find(h => h.id === habitId);
        if (!habit || habit.completedDates.includes(today)) return;

        const newStreak = habit.lastCompletedDate === yesterdayStr ? habit.streak + 1 : 1;
        const newLongest = Math.max(newStreak, habit.longestStreak);

        set((state) => ({
            habits: state.habits.map(h =>
                h.id === habitId
                    ? { ...h, completedDates: [...h.completedDates, today], streak: newStreak, longestStreak: newLongest, lastCompletedDate: today }
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
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        set((state) => ({
            habits: state.habits.map(habit => {
                if (habit.streak > 0 && habit.lastCompletedDate !== today && habit.lastCompletedDate !== yesterdayStr) {
                    return { ...habit, streak: 0 };
                }
                return habit;
            })
        }));
    },
});
