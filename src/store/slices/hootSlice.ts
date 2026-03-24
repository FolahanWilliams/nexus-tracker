import type { StateCreator } from 'zustand';
import type { GameState, HootSlice, HootMemoryNote, HootConversationSummary, HootUserProfile } from '../types';

const MAX_MEMORY_NOTES = 50;
const MAX_SUMMARIES = 20;

const DEFAULT_USER_PROFILE: HootUserProfile = {
    preferredDifficulty: null,
    peakProductivityTime: null,
    topCategories: [],
    avgDailyTasks: 0,
    coachingStyle: null,
    knownStruggles: [],
    activeGoalSummaries: [],
    lastProfileUpdate: null,
};

export const createHootSlice: StateCreator<GameState, [], [], HootSlice> = (set, get) => ({
    hootMemory: {
        notes: [],
        summaries: [],
        lastInteractionDate: null,
        userProfile: { ...DEFAULT_USER_PROFILE },
    },

    addHootMemoryNote: (text, category) => {
        const note: HootMemoryNote = {
            id: `hmn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text,
            category,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                notes: [note, ...state.hootMemory.notes].slice(0, MAX_MEMORY_NOTES),
            },
        }));
    },

    removeHootMemoryNote: (noteId) => {
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                notes: state.hootMemory.notes.filter((n) => n.id !== noteId),
            },
        }));
    },

    addHootConversationSummary: (summary, topics, actionsTaken) => {
        const entry: HootConversationSummary = {
            id: `hcs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            summary,
            topics,
            actionsTaken,
            date: new Date().toISOString().split('T')[0],
        };
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                summaries: [entry, ...state.hootMemory.summaries].slice(0, MAX_SUMMARIES),
            },
        }));
    },

    updateHootLastInteraction: () => {
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                lastInteractionDate: new Date().toISOString(),
            },
        }));
    },

    updateHootUserProfile: (updates) => {
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                userProfile: {
                    ...(state.hootMemory.userProfile ?? DEFAULT_USER_PROFILE),
                    ...updates,
                    lastProfileUpdate: new Date().toISOString(),
                },
            },
        }));
    },

    /**
     * Auto-derive user profile from behavioral data.
     * Called periodically (e.g. after quest completions, reflection submissions).
     */
    refreshUserProfile: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        // Compute preferred difficulty from completed tasks (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const recentCompleted = state.tasks.filter(
            t => t.completed && t.completedAt && t.completedAt >= thirtyDaysAgo
        );
        const diffCounts: Record<string, number> = {};
        for (const t of recentCompleted) {
            diffCounts[t.difficulty] = (diffCounts[t.difficulty] || 0) + 1;
        }
        const preferredDifficulty = Object.entries(diffCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] as HootUserProfile['preferredDifficulty'] ?? null;

        // Compute top categories
        const catCounts: Record<string, number> = {};
        for (const t of recentCompleted) {
            catCounts[t.category] = (catCounts[t.category] || 0) + 1;
        }
        const topCategories = Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);

        // Compute avg daily tasks (7-day rolling)
        let weekTotal = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            weekTotal += state.tasks.filter(
                t => t.completed && t.completedAt?.startsWith(dateStr)
            ).length;
        }
        const avgDailyTasks = Math.round((weekTotal / 7) * 10) / 10;

        // Detect peak productivity time from reflections
        const recentReflections = state.reflectionNotes.slice(-7);
        let peakProductivityTime: string | null = null;
        if (recentReflections.length >= 3) {
            const avgEnergy = recentReflections.reduce((s, r) => s + r.stars, 0) / recentReflections.length;
            // Simple heuristic: high energy = morning person, low = evening
            if (avgEnergy >= 4) peakProductivityTime = 'morning';
            else if (avgEnergy >= 3) peakProductivityTime = 'afternoon';
            else peakProductivityTime = 'evening';
        }

        // Extract struggles from memory notes
        const knownStruggles = state.hootMemory.notes
            .filter(n => n.category === 'struggle')
            .slice(0, 5)
            .map(n => n.text);

        // Extract active goals
        const activeGoalSummaries = state.goals
            .filter(g => !g.completed)
            .slice(0, 5)
            .map(g => g.title);

        // Preserve existing coaching style (only set by explicit user preference)
        const existingProfile = state.hootMemory.userProfile ?? DEFAULT_USER_PROFILE;

        set((s) => ({
            hootMemory: {
                ...s.hootMemory,
                userProfile: {
                    preferredDifficulty,
                    peakProductivityTime,
                    topCategories,
                    avgDailyTasks,
                    coachingStyle: existingProfile.coachingStyle,
                    knownStruggles,
                    activeGoalSummaries,
                    lastProfileUpdate: today,
                },
            },
        }));
    },
});
