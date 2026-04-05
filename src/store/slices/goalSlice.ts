import type { StateCreator } from 'zustand';
import type {
    GameState,
    GoalSlice,
    Goal,
    TimelineEvent,
    DailyCalendarEntry,
    BailEvent,
    IfThenPlan,
} from '../types';
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
    focusTimerEndTime: null,
    focusTimerPausedTimeLeft: null,
    focusTimerMode: 'focus' as const,
    focusTimerSessionCount: 0,
    dailyCalendarEntries: [] as DailyCalendarEntry[],

    // ── Akrasia state ──
    identityLine: null as string | null,
    identityVotes: [] as GoalSlice['identityVotes'],
    ifThenPlans: [] as IfThenPlan[],

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

    startFocusTimer: (mode, durationSeconds, taskId) => {
        set({
            focusTimerEndTime: Date.now() + durationSeconds * 1000,
            focusTimerPausedTimeLeft: null,
            focusTimerMode: mode,
            isFocusTimerRunning: true,
            activeFocusTaskId: taskId,
        });
    },

    pauseFocusTimer: (remainingSeconds) => {
        set({
            focusTimerEndTime: null,
            focusTimerPausedTimeLeft: remainingSeconds,
            isFocusTimerRunning: false,
            activeFocusTaskId: null,
        });
    },

    stopFocusTimer: () => {
        set({
            focusTimerEndTime: null,
            focusTimerPausedTimeLeft: null,
            isFocusTimerRunning: false,
            activeFocusTaskId: null,
        });
    },

    setFocusTimerMode: (mode, durationSeconds) => {
        set({
            focusTimerMode: mode,
            focusTimerEndTime: null,
            focusTimerPausedTimeLeft: durationSeconds,
            isFocusTimerRunning: false,
            activeFocusTaskId: null,
        });
    },

    setFocusTimerSessionCount: (count) => {
        set({ focusTimerSessionCount: count });
    },

    // ── Slight Edge Calendar ──
    addOrUpdateCalendarEntry: (date, completed, summary, learned, productivityScore = 5) => {
        const safeSummary = summary.trim().slice(0, 1000);
        const safeLearned = learned.trim().slice(0, 1000);
        const safeScore = Math.min(10, Math.max(1, Math.round(productivityScore)));
        const now = new Date().toISOString();
        set((state) => {
            const existing = state.dailyCalendarEntries.find(e => e.date === date);
            if (existing) {
                return {
                    dailyCalendarEntries: state.dailyCalendarEntries.map(e =>
                        e.date === date ? { ...e, completed, summary: safeSummary, learned: safeLearned, productivityScore: safeScore, updatedAt: now } : e
                    ),
                };
            }
            const newEntry: DailyCalendarEntry = { date, completed, summary: safeSummary, learned: safeLearned, productivityScore: safeScore, createdAt: now, updatedAt: now };
            if (completed) {
                get().addXP(3);
                get().logActivity('reflection', '📅', `Slight Edge day logged: ${date}`, '+3 XP');
            }
            return { dailyCalendarEntries: [...state.dailyCalendarEntries, newEntry] };
        });
    },

    // ── Akrasia: Identity Line + Votes ──
    setIdentityLine: (line) => {
        const safe = typeof line === 'string' ? line.trim().slice(0, 280) : null;
        set({ identityLine: safe && safe.length > 0 ? safe : null });
        if (safe) get().logActivity('reflection', '🪞', `Identity line set: "${safe.slice(0, 60)}${safe.length > 60 ? '…' : ''}"`);
    },

    recordIdentityVote: (date, vote, reason) => {
        set((state) => {
            const filtered = state.identityVotes.filter((v) => v.date !== date);
            return { identityVotes: [...filtered, { date, vote, reason: reason?.slice(0, 200) }] };
        });
    },

    // ── Akrasia: Micro-Action ──
    setMicroAction: (date, micro) => {
        const now = new Date().toISOString();
        set((state) => {
            const existing = state.dailyCalendarEntries.find((e) => e.date === date);
            if (existing) {
                return {
                    dailyCalendarEntries: state.dailyCalendarEntries.map((e) =>
                        e.date === date ? { ...e, microAction: micro ?? undefined, updatedAt: now } : e
                    ),
                };
            }
            const newEntry: DailyCalendarEntry = {
                date,
                completed: false,
                summary: '',
                learned: '',
                productivityScore: 5,
                createdAt: now,
                updatedAt: now,
                microAction: micro ?? undefined,
            };
            return { dailyCalendarEntries: [...state.dailyCalendarEntries, newEntry] };
        });
    },

    updateMicroActionStatus: (date, status, bailReason) => {
        const now = new Date().toISOString();
        set((state) => ({
            dailyCalendarEntries: state.dailyCalendarEntries.map((e) => {
                if (e.date !== date || !e.microAction) return e;
                return {
                    ...e,
                    microAction: {
                        ...e.microAction,
                        status,
                        bailReason: bailReason?.slice(0, 500) ?? e.microAction.bailReason,
                    },
                    updatedAt: now,
                };
            }),
        }));
        if (status === 'done') {
            get().addXP(5);
            get().logActivity('reflection', '✅', `Micro-action done for ${date}`, '+5 XP');
        }
    },

    // ── Akrasia: Bails ──
    addBail: (date, bail) => {
        const now = new Date().toISOString();
        const newBail: BailEvent = {
            id: crypto.randomUUID(),
            timestamp: now,
            chose: bail.chose.trim().slice(0, 200),
            instead: bail.instead.trim().slice(0, 200),
            emotion: bail.emotion,
            trigger: bail.trigger.trim().slice(0, 500),
            durationMinutes: bail.durationMinutes,
        };
        set((state) => {
            const existing = state.dailyCalendarEntries.find((e) => e.date === date);
            if (existing) {
                return {
                    dailyCalendarEntries: state.dailyCalendarEntries.map((e) =>
                        e.date === date ? { ...e, bails: [...(e.bails ?? []), newBail], updatedAt: now } : e
                    ),
                };
            }
            const newEntry: DailyCalendarEntry = {
                date,
                completed: false,
                summary: '',
                learned: '',
                productivityScore: 5,
                createdAt: now,
                updatedAt: now,
                bails: [newBail],
            };
            return { dailyCalendarEntries: [...state.dailyCalendarEntries, newEntry] };
        });
        get().logActivity('reflection', '🚨', `Bail logged: chose "${newBail.chose}" instead of "${newBail.instead}"`);
    },

    // ── Akrasia: Gap Capture (wanted/did) ──
    updateDailyWantedDid: (date, wanted, did, gapAnalysis) => {
        const now = new Date().toISOString();
        const safeWanted = wanted.trim().slice(0, 2000);
        const safeDid = did.trim().slice(0, 2000);
        set((state) => {
            const existing = state.dailyCalendarEntries.find((e) => e.date === date);
            if (existing) {
                return {
                    dailyCalendarEntries: state.dailyCalendarEntries.map((e) =>
                        e.date === date ? {
                            ...e,
                            wanted: safeWanted,
                            did: safeDid,
                            summary: safeDid || e.summary,
                            gapAnalysis: gapAnalysis ?? e.gapAnalysis,
                            updatedAt: now,
                        } : e
                    ),
                };
            }
            const newEntry: DailyCalendarEntry = {
                date,
                completed: false,
                summary: safeDid,
                learned: '',
                productivityScore: 5,
                createdAt: now,
                updatedAt: now,
                wanted: safeWanted,
                did: safeDid,
                gapAnalysis,
            };
            return { dailyCalendarEntries: [...state.dailyCalendarEntries, newEntry] };
        });
    },

    // ── Akrasia: Outreach Block ──
    setOutreachBlock: (date, block) => {
        const now = new Date().toISOString();
        set((state) => {
            const existing = state.dailyCalendarEntries.find((e) => e.date === date);
            if (existing) {
                return {
                    dailyCalendarEntries: state.dailyCalendarEntries.map((e) =>
                        e.date === date ? { ...e, outreachBlock: block ?? undefined, updatedAt: now } : e
                    ),
                };
            }
            const newEntry: DailyCalendarEntry = {
                date,
                completed: false,
                summary: '',
                learned: '',
                productivityScore: 5,
                createdAt: now,
                updatedAt: now,
                outreachBlock: block ?? undefined,
            };
            return { dailyCalendarEntries: [...state.dailyCalendarEntries, newEntry] };
        });
    },

    completeOutreachBlock: (date) => {
        const now = new Date().toISOString();
        set((state) => ({
            dailyCalendarEntries: state.dailyCalendarEntries.map((e) => {
                if (e.date !== date || !e.outreachBlock) return e;
                return {
                    ...e,
                    outreachBlock: { ...e.outreachBlock, completed: true, completedAt: now },
                    updatedAt: now,
                };
            }),
        }));
        get().addXP(20);
        get().logActivity('reflection', '🎯', `Outreach block completed for ${date}`, '+20 XP');
    },

    // ── Akrasia: If-Then Armor ──
    addIfThenPlan: (trigger, response) => {
        const t = trigger.trim().slice(0, 300);
        const r = response.trim().slice(0, 300);
        if (!t || !r) return;
        const plan: IfThenPlan = {
            id: crypto.randomUUID(),
            trigger: t,
            response: r,
            createdAt: new Date().toISOString(),
            timesFired: 0,
            timesBroken: 0,
            active: true,
        };
        set((state) => ({ ifThenPlans: [...state.ifThenPlans, plan] }));
    },

    fireIfThenPlan: (id) => {
        set((state) => ({
            ifThenPlans: state.ifThenPlans.map((p) => p.id === id ? { ...p, timesFired: p.timesFired + 1 } : p),
        }));
        get().addXP(2);
    },

    breakIfThenPlan: (id) => {
        set((state) => ({
            ifThenPlans: state.ifThenPlans.map((p) => p.id === id ? { ...p, timesBroken: p.timesBroken + 1 } : p),
        }));
    },

    toggleIfThenPlan: (id) => {
        set((state) => ({
            ifThenPlans: state.ifThenPlans.map((p) => p.id === id ? { ...p, active: !p.active } : p),
        }));
    },

    deleteIfThenPlan: (id) => {
        set((state) => ({ ifThenPlans: state.ifThenPlans.filter((p) => p.id !== id) }));
    },
});
