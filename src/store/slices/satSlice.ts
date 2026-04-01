import type { StateCreator } from 'zustand';
import type { GameState, SATSlice, SATDailySession, SATScoreboard } from '../types';

const SAT_BLOCK_XP = { A: 30, B: 40, C: 30, D: 40 } as const;
const SAT_BLOCK_GOLD = { A: 6, B: 8, C: 6, D: 8 } as const;
const SAT_FULL_SESSION_BONUS = { xp: 60, gold: 12 } as const;

const today = () => new Date().toISOString().split('T')[0];

const DEFAULT_SAT_SCOREBOARD: SATScoreboard = {
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    vocabMastered: 0,
    avgRWScore: 0,
    avgMathScore: 0,
    projectedTotal: 0,
    totalTests: 0,
};

function checkFullSATSession(session: SATDailySession): boolean {
    return session.blockAComplete && session.blockBComplete && session.blockCComplete && session.blockDComplete;
}

export const createSatSlice: StateCreator<GameState, [], [], SATSlice> = (set, get) => ({
    satDailySession: null,
    satPassages: [],
    satWritingQuestions: [],
    satMathProblems: [],
    satTestResults: [],
    satScoreboard: { ...DEFAULT_SAT_SCOREBOARD },

    initSATDailySession: () => {
        const todayStr = today();
        const existing = get().satDailySession;
        if (existing && existing.date === todayStr) return;

        const session: SATDailySession = {
            date: todayStr,
            blockAComplete: false,
            blockBComplete: false,
            blockCComplete: false,
            blockDComplete: false,
        };
        set({ satDailySession: session });

        // Update streak
        const scoreboard = get().satScoreboard;
        const lastActive = scoreboard.lastActiveDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive && lastActive !== todayStr) {
            if (lastActive !== yesterdayStr) {
                set((state) => ({
                    satScoreboard: { ...state.satScoreboard, currentStreak: 0 },
                }));
            }
        }
    },

    markSATBlockComplete: (block) => {
        const session = get().satDailySession;
        if (!session) return;

        const blockKey = `block${block}Complete` as keyof SATDailySession;
        if (session[blockKey]) return;

        const xp = SAT_BLOCK_XP[block];
        const gold = SAT_BLOCK_GOLD[block];

        set((state) => ({
            satDailySession: state.satDailySession
                ? { ...state.satDailySession, [blockKey]: true }
                : null,
        }));

        get().addXP(xp);
        get().addGold(gold);
        get().logActivity('sat_block_complete', '📚', `SAT Block ${block} completed`, `+${xp} XP`);

        // Update streak on first block of the day
        const todayStr = today();
        const scoreboard = get().satScoreboard;
        if (scoreboard.lastActiveDate !== todayStr) {
            const newStreak = scoreboard.currentStreak + 1;
            set((state) => ({
                satScoreboard: {
                    ...state.satScoreboard,
                    currentStreak: newStreak,
                    longestStreak: Math.max(state.satScoreboard.longestStreak, newStreak),
                    lastActiveDate: todayStr,
                    totalSessions: state.satScoreboard.totalSessions + 1,
                },
            }));
        }

        // Full session bonus
        const updatedSession = get().satDailySession;
        if (updatedSession && checkFullSATSession(updatedSession)) {
            get().addXP(SAT_FULL_SESSION_BONUS.xp);
            get().addGold(SAT_FULL_SESSION_BONUS.gold);
            get().logActivity('sat_full_session', '🎓', 'Full SAT daily session completed!', `+${SAT_FULL_SESSION_BONUS.xp} XP bonus`);
        }
    },

    addSATPassage: (passage) => {
        const full = { ...passage, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ satPassages: [...state.satPassages.slice(-49), full] }));
    },

    addSATWritingQ: (q) => {
        const full = { ...q, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ satWritingQuestions: [...state.satWritingQuestions.slice(-99), full] }));
    },

    addSATMathProblem: (p) => {
        const full = { ...p, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ satMathProblems: [...state.satMathProblems.slice(-99), full] }));
    },

    recordSATTestResult: (result) => {
        const full = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ satTestResults: [...state.satTestResults, full] }));
        get().refreshSATScoreboard();
    },

    refreshSATScoreboard: () => {
        const results = get().satTestResults;
        const vocabWords = get().vocabWords;
        const satVocab = vocabWords.filter(w => w.category === 'SAT');
        const mastered = satVocab.filter(w => w.status === 'mastered').length;

        const rwResults = results.filter(r => r.section === 'reading-writing' || r.section === 'full');
        const mathResults = results.filter(r => r.section === 'math' || r.section === 'full');

        const avgRW = rwResults.length > 0
            ? Math.round(rwResults.slice(-10).reduce((sum, r) => sum + r.score, 0) / Math.min(rwResults.length, 10))
            : 0;
        const avgMath = mathResults.length > 0
            ? Math.round(mathResults.slice(-10).reduce((sum, r) => sum + r.score, 0) / Math.min(mathResults.length, 10))
            : 0;

        set((state) => ({
            satScoreboard: {
                ...state.satScoreboard,
                vocabMastered: mastered,
                avgRWScore: avgRW,
                avgMathScore: avgMath,
                projectedTotal: avgRW + avgMath || 0,
                totalTests: results.length,
            },
        }));
    },
});
