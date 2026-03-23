import type { StateCreator } from 'zustand';
import type { GameState, UiSlice } from '../types';

export const createUiSlice: StateCreator<GameState, [], [], UiSlice> = (set) => ({
    // ── State ──
    uiTabs: {},
    uiCalendarYear: new Date().getFullYear(),
    uiCalendarMonth: new Date().getMonth(),
    uiGoalDraft: null,
    uiHabitDraft: null,
    uiArgumentDraft: null,
    uiWeeklyPlan: { plan: null, generatedAt: null },
    uiReviewMode: null,
    uiReviewQuizMode: 'adaptive',

    // ── Actions ──
    setUiTab: (page, tab) => {
        set((state) => ({ uiTabs: { ...state.uiTabs, [page]: tab } }));
    },

    setUiCalendarPosition: (year, month) => {
        set({ uiCalendarYear: year, uiCalendarMonth: month });
    },

    setUiGoalDraft: (draft) => {
        set({ uiGoalDraft: draft });
    },

    setUiHabitDraft: (draft) => {
        set({ uiHabitDraft: draft });
    },

    setUiArgumentDraft: (draft) => {
        set({ uiArgumentDraft: draft });
    },

    setUiWeeklyPlan: (plan) => {
        set({ uiWeeklyPlan: { plan, generatedAt: plan ? new Date().toISOString() : null } });
    },

    setUiReviewMode: (mode) => {
        set({ uiReviewMode: mode });
    },

    setUiReviewQuizMode: (mode) => {
        set({ uiReviewQuizMode: mode });
    },
});
