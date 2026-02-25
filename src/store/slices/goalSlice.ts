import type { StateCreator } from 'zustand';
import type { GameState, GoalSlice, Goal, TimelineEvent } from '../types';
import { validateGoalTitle, validateGoalDescription, validateTimelineEventName, validateTimelineSubject, ValidationError } from '@/lib/validation';
import { logger } from '@/lib/logger';

export const createGoalSlice: StateCreator<GameState, [], [], GoalSlice> = (set, get) => ({
    // ── State ──
    goals: [],
    timelineEvents: [],
    lastIntentionDate: null,
    lastReflectionDate: null,
    todayIntention: '',
    todayEnergyRating: 3,
    reflectionNotes: [] as { date: string; note: string; stars: number }[],
    focusSessionsTotal: 0,
    focusMinutesTotal: 0,
    isFocusTimerRunning: false,
    activeFocusTaskId: null,

    // ── Goal Actions ──
    addGoal: (title, description, category, timeframe, targetDate, milestones, xpReward) => {
        try {
            const validatedTitle = validateGoalTitle(title);
            const validatedDescription = validateGoalDescription(description);
            const validatedMilestones = milestones.filter(m => m.trim()).map(m => m.slice(0, 150)).slice(0, 20);

            const newGoal: Goal = {
                id: crypto.randomUUID(),
                title: validatedTitle,
                description: validatedDescription,
                category,
                timeframe,
                targetDate,
                milestones: validatedMilestones.map(m => ({ id: crypto.randomUUID(), title: m, completed: false })),
                completed: false,
                createdAt: new Date().toISOString(),
                xpReward,
            };
            set((state) => ({ goals: [...state.goals, newGoal] }));
        } catch (error) {
            if (error instanceof ValidationError) logger.error(`Validation error: ${error.message}`, 'store');
            throw error;
        }
    },

    completeGoalMilestone: (goalId, milestoneId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal || goal.completed) return;
        const wasAlreadyCompleted = goal.milestones.find(m => m.id === milestoneId)?.completed;
        if (wasAlreadyCompleted) return;

        set((state) => ({
            goals: state.goals.map(g => {
                if (g.id !== goalId) return g;
                const updatedMilestones = g.milestones.map(m => m.id === milestoneId ? { ...m, completed: true, completedAt: new Date().toISOString() } : m);
                const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.completed);
                return { ...g, milestones: updatedMilestones, completed: allDone, completedAt: allDone ? new Date().toISOString() : undefined };
            })
        }));

        const updatedGoal = get().goals.find(g => g.id === goalId);
        if (updatedGoal?.completed) {
            get().addXP(updatedGoal.xpReward);
            get().addGold(Math.ceil(updatedGoal.xpReward / 2));
            get().logActivity('goal_milestone', '🎯', `Goal completed: "${updatedGoal.title}"`, `+${updatedGoal.xpReward} XP`);
        } else {
            const milestone = goal.milestones.find(m => m.id === milestoneId);
            const done = updatedGoal?.milestones.filter(m => m.completed).length ?? 0;
            const total = updatedGoal?.milestones.length ?? 0;
            get().logActivity('goal_milestone', '🏁', `Milestone "${milestone?.title}" done`, `${done}/${total} on "${goal.title}"`);
        }
    },

    completeGoal: (goalId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal || goal.completed) return;
        set((state) => ({
            goals: state.goals.map(g => g.id === goalId ? { ...g, completed: true, completedAt: new Date().toISOString() } : g)
        }));
        get().addXP(goal.xpReward);
        get().addGold(Math.ceil(goal.xpReward / 2));
    },

    deleteGoal: (goalId) => {
        set((state) => ({ goals: state.goals.filter(g => g.id !== goalId) }));
    },

    restoreGoal: (goal) => {
        set((state) => ({ goals: [...state.goals, goal] }));
    },

    updateGoalProgress: (goalId, progress) => {
        const safe = Math.min(100, Math.max(0, Math.round(progress)));
        set((state) => ({ goals: state.goals.map(g => g.id !== goalId ? g : { ...g, manualProgress: safe }) }));
    },

    // ── Timeline Actions ──
    addTimelineEvent: (name, date, subject, status, statusColor) => {
        try {
            const validatedName = validateTimelineEventName(name);
            const validatedSubject = validateTimelineSubject(subject);
            const newEvent: TimelineEvent = { id: crypto.randomUUID(), name: validatedName, date, subject: validatedSubject, status, statusColor };
            set((state) => ({ timelineEvents: [...state.timelineEvents, newEvent] }));
        } catch (error) {
            if (error instanceof ValidationError) logger.error(`Validation error: ${error.message}`, 'store');
            throw error;
        }
    },

    updateTimelineEvent: (id, updates) => {
        set((state) => ({
            timelineEvents: state.timelineEvents.map((event) => event.id === id ? { ...event, ...updates } : event),
        }));
    },

    deleteTimelineEvent: (id) => {
        set((state) => ({ timelineEvents: state.timelineEvents.filter((e) => e.id !== id) }));
    },

    // ── Intention & Reflection ──
    setDailyIntention: (intention, energyRating) => {
        if (typeof intention !== 'string' || !intention.trim()) return;
        const safeRating = Math.min(5, Math.max(1, Math.round(energyRating)));
        const safeIntention = intention.trim().slice(0, 500);
        const today = new Date().toISOString().split('T')[0];
        set({ todayIntention: safeIntention, todayEnergyRating: safeRating, lastIntentionDate: today });
        get().addXP(10);
    },

    addReflectionNote: (note, stars, xpBonus) => {
        if (typeof note !== 'string' || !note.trim()) return;
        const safeStars = Math.min(5, Math.max(1, Math.round(stars)));
        const safeBonus = Math.min(100, Math.max(0, Math.floor(xpBonus)));
        const safeNote = note.trim().slice(0, 2000);
        const today = new Date().toISOString().split('T')[0];
        set((state) => ({
            lastReflectionDate: today,
            reflectionNotes: [
                { date: today, note: safeNote, stars: safeStars },
                ...state.reflectionNotes.slice(0, 29)
            ]
        }));
        if (safeBonus > 0) get().addXP(safeBonus);
        get().logActivity('reflection', '📝', `Daily reflection (${safeStars}★)`, safeBonus > 0 ? `+${safeBonus} XP` : undefined);
    },

    // ── Focus Timer ──
    addFocusSession: (minutesCompleted) => {
        const safeMins = Math.max(0, Math.floor(minutesCompleted));
        set((state) => ({
            focusSessionsTotal: state.focusSessionsTotal + 1,
            focusMinutesTotal: state.focusMinutesTotal + safeMins,
        }));
    },

    setFocusTimerRunning: (running, taskId = null) => {
        set({ isFocusTimerRunning: running, activeFocusTaskId: taskId });
    },
});
