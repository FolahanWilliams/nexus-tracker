import type { StateCreator } from 'zustand';
import type { GameState, HitsSlice, HitsScoreboard, HitsDailySession, KnowledgePillar } from '../types';
import {
    HITS_BLOCK_XP,
    HITS_BLOCK_GOLD,
    HITS_FULL_SESSION_BONUS,
    HITS_WEEKLY_SYNTHESIS_XP,
    HITS_WEEKLY_SYNTHESIS_GOLD,
    HITS_MONTHLY_CHALLENGE_XP,
    HITS_MONTHLY_CHALLENGE_GOLD,
    HITS_BIWEEKLY_ESSAY_XP,
    HITS_BIWEEKLY_ESSAY_GOLD,
    HITS_PILLAR_SCHEDULE,
    HITS_MODEL_CARDS_MAX,
    HITS_OUTPUTS_MAX,
    HITS_REFLECTIONS_MAX,
} from '@/lib/constants';

const today = () => new Date().toISOString().split('T')[0];

function getMonday(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
}

function getTodayPillar(): KnowledgePillar {
    return HITS_PILLAR_SCHEDULE[new Date().getDay()] ?? 'synthesis';
}

const DEFAULT_SCOREBOARD: HitsScoreboard = {
    modelCardsThisWeek: 0,
    speakingRepsThisWeek: 0,
    essaysThisWeek: 0,
    synthesisThisWeek: 0,
    founderDocsThisWeek: 0,
    deepWorkSprintsThisWeek: 0,
    weekStartDate: getMonday(new Date()),
    totalModelCards: 0,
    totalEssays: 0,
    totalSpeakingReps: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
};

function checkFullSession(session: HitsDailySession): boolean {
    return session.blockAComplete && session.blockBComplete && session.blockCComplete && session.blockDComplete && session.blockEComplete;
}

export const createHitsSlice: StateCreator<GameState, [], [], HitsSlice> = (set, get) => ({
    // ── State ──
    hitsModelCards: [],
    hitsTransferDrills: [],
    hitsOutputs: [],
    hitsReflections: [],
    hitsRecallTests: [],
    hitsWeeklySyntheses: [],
    hitsMonthlyChallenges: [],
    hitsBiweeklyEssays: [],
    hitsScoreboard: { ...DEFAULT_SCOREBOARD },
    hitsDailySession: null,

    // ── Daily Session ──
    initDailySession: () => {
        const todayStr = today();
        const existing = get().hitsDailySession;
        if (existing && existing.date === todayStr) return;

        const session: HitsDailySession = {
            date: todayStr,
            pillar: getTodayPillar(),
            blockAComplete: false,
            blockBComplete: false,
            blockCComplete: false,
            blockDComplete: false,
            blockEComplete: false,
        };
        set({ hitsDailySession: session });

        // Update streak
        const scoreboard = get().hitsScoreboard;
        const lastActive = scoreboard.lastActiveDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive && lastActive !== todayStr) {
            if (lastActive === yesterdayStr) {
                // Streak continues (will be incremented when a block is completed)
            } else {
                // Streak broken
                set((state) => ({
                    hitsScoreboard: { ...state.hitsScoreboard, currentStreak: 0 },
                }));
            }
        }
    },

    markBlockComplete: (block) => {
        const session = get().hitsDailySession;
        if (!session) return;

        const blockKey = `block${block}Complete` as keyof HitsDailySession;
        if (session[blockKey]) return; // Already complete

        const xp = HITS_BLOCK_XP[block];
        const gold = HITS_BLOCK_GOLD[block];

        set((state) => ({
            hitsDailySession: state.hitsDailySession
                ? { ...state.hitsDailySession, [blockKey]: true }
                : null,
        }));

        get().addXP(xp);
        get().addGold(gold);
        get().logActivity('hits_block_complete', '🧠', `HITS Block ${block} completed`, `+${xp} XP`);

        // Update streak on first block of the day
        const todayStr = today();
        const scoreboard = get().hitsScoreboard;
        if (scoreboard.lastActiveDate !== todayStr) {
            const newStreak = scoreboard.currentStreak + 1;
            set((state) => ({
                hitsScoreboard: {
                    ...state.hitsScoreboard,
                    currentStreak: newStreak,
                    longestStreak: Math.max(state.hitsScoreboard.longestStreak, newStreak),
                    lastActiveDate: todayStr,
                },
            }));
        }

        // Check full session bonus
        const updatedSession = get().hitsDailySession;
        if (updatedSession && checkFullSession(updatedSession)) {
            get().addXP(HITS_FULL_SESSION_BONUS.xp);
            get().addGold(HITS_FULL_SESSION_BONUS.gold);
            get().logActivity('hits_block_complete', '🏆', 'Full HITS daily session completed!', `+${HITS_FULL_SESSION_BONUS.xp} XP bonus`);
        }
    },

    // ── Block A: Model Cards ──
    addModelCard: (card) => {
        const now = new Date().toISOString();
        const newCard = { ...card, id: crypto.randomUUID(), createdAt: now };

        set((state) => ({
            hitsModelCards: [newCard, ...state.hitsModelCards].slice(0, HITS_MODEL_CARDS_MAX),
        }));

        // Add to knowledge graph
        get().addKnowledgeNodes([{
            id: crypto.randomUUID(),
            label: card.name,
            nodeType: 'concept',
            category: card.pillar,
            source: 'hits',
            sourceId: newCard.id,
            firstSeenAt: now,
            lastSeenAt: now,
            mentionCount: 1,
            masteryScore: null,
        }]);

        get().markBlockComplete('A');
        get().refreshScoreboard();
    },

    deleteModelCard: (id) => {
        set((state) => ({
            hitsModelCards: state.hitsModelCards.filter((c) => c.id !== id),
        }));
    },

    // ── Block B: Transfer Drills ──
    addTransferDrill: (drill) => {
        const newDrill = { ...drill, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({
            hitsTransferDrills: [newDrill, ...state.hitsTransferDrills].slice(0, HITS_MODEL_CARDS_MAX),
        }));
        get().markBlockComplete('B');
    },

    // ── Block C: Output ──
    addHitsOutput: (output) => {
        const newOutput = { ...output, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({
            hitsOutputs: [newOutput, ...state.hitsOutputs].slice(0, HITS_OUTPUTS_MAX),
        }));
        get().markBlockComplete('C');
        get().refreshScoreboard();
    },

    // ── Block D: Reflection ──
    addReflection: (reflection) => {
        const newReflection = { ...reflection, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({
            hitsReflections: [newReflection, ...state.hitsReflections].slice(0, HITS_REFLECTIONS_MAX),
        }));
        get().markBlockComplete('D');
    },

    // ── Block E: Recall Test ──
    addRecallTest: (test) => {
        const newTest = { ...test, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({
            hitsRecallTests: [newTest, ...state.hitsRecallTests].slice(0, HITS_MODEL_CARDS_MAX),
        }));

        // Update recall score on the model card
        set((state) => ({
            hitsModelCards: state.hitsModelCards.map((c) =>
                c.id === test.modelCardId
                    ? { ...c, recallScore: test.score, lastRecalledAt: new Date().toISOString() }
                    : c
            ),
        }));

        get().markBlockComplete('E');
    },

    // ── Weekly ──
    addWeeklySynthesis: (synthesis) => {
        const newSynthesis = { ...synthesis, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({
            hitsWeeklySyntheses: [newSynthesis, ...state.hitsWeeklySyntheses].slice(0, 52),
        }));
        get().addXP(HITS_WEEKLY_SYNTHESIS_XP);
        get().addGold(HITS_WEEKLY_SYNTHESIS_GOLD);
        get().logActivity('hits_weekly_complete', '📊', 'Weekly synthesis completed', `+${HITS_WEEKLY_SYNTHESIS_XP} XP`);
        get().refreshScoreboard();
    },

    updateWeeklySynthesis: (id, updates) => {
        set((state) => ({
            hitsWeeklySyntheses: state.hitsWeeklySyntheses.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            ),
        }));
        get().refreshScoreboard();
    },

    // ── Monthly ──
    addMonthlyChallenge: (challenge) => {
        const newChallenge = { ...challenge, id: crypto.randomUUID(), createdAt: new Date().toISOString(), completed: false };
        set((state) => ({
            hitsMonthlyChallenges: [newChallenge, ...state.hitsMonthlyChallenges].slice(0, 24),
        }));
    },

    completeMonthlyChallenge: (id) => {
        const challenge = get().hitsMonthlyChallenges.find((c) => c.id === id);
        if (!challenge || challenge.completed) return;

        set((state) => ({
            hitsMonthlyChallenges: state.hitsMonthlyChallenges.map((c) =>
                c.id === id ? { ...c, completed: true } : c
            ),
        }));
        get().addXP(HITS_MONTHLY_CHALLENGE_XP);
        get().addGold(HITS_MONTHLY_CHALLENGE_GOLD);
        get().logActivity('hits_monthly_complete', '🏅', `Monthly challenge completed: "${challenge.topic}"`, `+${HITS_MONTHLY_CHALLENGE_XP} XP`);
    },

    // ── Biweekly ──
    addBiweeklyEssay: (essay) => {
        const newEssay = { ...essay, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({
            hitsBiweeklyEssays: [newEssay, ...state.hitsBiweeklyEssays].slice(0, 26),
        }));
        get().addXP(HITS_BIWEEKLY_ESSAY_XP);
        get().addGold(HITS_BIWEEKLY_ESSAY_GOLD);
        get().logActivity('hits_monthly_complete', '📝', 'Biweekly synthesis essay completed', `+${HITS_BIWEEKLY_ESSAY_XP} XP`);
    },

    // ── Scoreboard ──
    refreshScoreboard: () => {
        const state = get();
        const currentMonday = getMonday(new Date());
        const scoreboard = state.hitsScoreboard;

        // Reset weekly counters if new week
        const isNewWeek = scoreboard.weekStartDate !== currentMonday;

        const weekStart = new Date(currentMonday).toISOString();
        const modelCardsThisWeek = state.hitsModelCards.filter((c) => c.createdAt >= weekStart).length;
        const essaysThisWeek = state.hitsOutputs.filter((o) => o.type === 'mini_essay' && o.createdAt >= weekStart).length;
        const founderDocsThisWeek = state.hitsOutputs.filter((o) => o.type === 'founder_memo' && o.createdAt >= weekStart).length;
        const synthesisThisWeek = state.hitsWeeklySyntheses.filter((s) => s.createdAt >= weekStart).length;
        const speakingRepsThisWeek = state.hitsWeeklySyntheses.filter((s) => s.speakingDrillTopic && s.createdAt >= weekStart).length;
        const deepWorkSprintsThisWeek = state.hitsWeeklySyntheses.filter((s) => s.deepWorkSprintTopic && s.createdAt >= weekStart).length;

        set({
            hitsScoreboard: {
                ...scoreboard,
                modelCardsThisWeek,
                essaysThisWeek,
                founderDocsThisWeek,
                synthesisThisWeek,
                speakingRepsThisWeek,
                deepWorkSprintsThisWeek,
                weekStartDate: currentMonday,
                totalModelCards: state.hitsModelCards.length,
                totalEssays: state.hitsOutputs.filter((o) => o.type === 'mini_essay').length,
                totalSpeakingReps: isNewWeek ? scoreboard.totalSpeakingReps : scoreboard.totalSpeakingReps,
                currentStreak: scoreboard.currentStreak,
                longestStreak: scoreboard.longestStreak,
                lastActiveDate: scoreboard.lastActiveDate,
            },
        });
    },
});
