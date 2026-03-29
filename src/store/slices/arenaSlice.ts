import type { StateCreator } from 'zustand';
import type { GameState, ArenaSlice, ArenaEnemy, GauntletPuzzle, MysteryStep } from '../types';
import { PLAYER_MAX_HP, GAUNTLET_INITIAL_TIME_MS, GAUNTLET_COMBO_MULTIPLIERS, GAUNTLET_BASE_POINTS, getDetectiveRank, LETTER_SCORES, TIME_PRESSURE_DURATION_MS } from '@/lib/arenaConstants';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const DEFAULT_BATTLE = {
    enemy: null,
    playerHp: PLAYER_MAX_HP,
    playerMaxHp: PLAYER_MAX_HP,
    letterPool: [],
    currentTurn: 0,
    maxTurns: 0,
    wordsUsed: [],
    vocabStrikes: 0,
    totalDamageDealt: 0,
    turnTimerDeadlineMs: null as number | null,
    lastAbilityMessage: null as string | null,
    status: 'idle' as const,
};

const DEFAULT_GAUNTLET = {
    puzzles: [],
    currentPuzzleIndex: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeRemainingMs: GAUNTLET_INITIAL_TIME_MS,
    correctCount: 0,
    incorrectCount: 0,
    vocabBonuses: 0,
    status: 'idle' as const,
};

const DEFAULT_MYSTERY = {
    id: null,
    title: '',
    narrative: '',
    steps: [],
    currentStep: 0,
    hintsUsedTotal: 0,
    startedAt: null,
    status: 'idle' as const,
};

const DEFAULT_STATS = {
    battlesWon: 0,
    battlesLost: 0,
    battleWinStreak: 0,
    bestBattleWinStreak: 0,
    gauntletHighScore: 0,
    gauntletTotalPlayed: 0,
    mysteriesSolved: 0,
    mysteriesAbandoned: 0,
    totalArenaXpEarned: 0,
    totalArenaGoldEarned: 0,
    detectiveRank: 'Novice' as const,
};

export const createArenaSlice: StateCreator<GameState, [], [], ArenaSlice> = (set) => ({
    arenaMode: 'battle',
    arenaBattle: { ...DEFAULT_BATTLE },
    arenaGauntlet: { ...DEFAULT_GAUNTLET },
    arenaMystery: { ...DEFAULT_MYSTERY },
    arenaStats: { ...DEFAULT_STATS },
    arenaLoading: false,

    setArenaMode: (mode) => set({ arenaMode: mode }),

    // ── Battle Actions ──

    startBattle: (enemy: ArenaEnemy, letterPool: string[]) =>
        set({
            arenaBattle: {
                enemy,
                playerHp: PLAYER_MAX_HP,
                playerMaxHp: PLAYER_MAX_HP,
                letterPool,
                currentTurn: 1,
                maxTurns: enemy.difficulty === 'easy' ? 5 : enemy.difficulty === 'medium' ? 7 : enemy.difficulty === 'hard' ? 10 : 12,
                wordsUsed: [],
                vocabStrikes: 0,
                totalDamageDealt: 0,
                turnTimerDeadlineMs: null,
                lastAbilityMessage: null,
                status: 'active',
            },
        }),

    submitBattleWord: (word: string, damage: number, isVocabStrike: boolean) =>
        set((state) => {
            const battle = { ...state.arenaBattle };
            if (!battle.enemy || battle.status !== 'active') return state;

            const enemy = { ...battle.enemy };
            enemy.hp = Math.max(0, enemy.hp - damage);
            battle.enemy = enemy;
            battle.wordsUsed = [...battle.wordsUsed, word];
            battle.totalDamageDealt += damage;
            if (isVocabStrike) battle.vocabStrikes += 1;
            // Clear timer on successful word (resets time pressure)
            battle.turnTimerDeadlineMs = null;
            battle.lastAbilityMessage = null;

            if (enemy.hp <= 0) {
                battle.status = 'victory';
            }

            return { arenaBattle: battle };
        }),

    enemyAttack: () =>
        set((state) => {
            const battle = { ...state.arenaBattle };
            if (!battle.enemy || battle.status !== 'active') return state;

            let damage = battle.enemy.attackDamage;
            let abilityMessage: string | null = null;

            // -- Special abilities --
            const ability = battle.enemy.specialAbility;

            if (ability === 'double_attack') {
                damage = Math.floor(damage * 1.5);
                abilityMessage = 'Double Attack! The enemy strikes with devastating force!';
            }

            battle.playerHp = Math.max(0, battle.playerHp - damage);
            battle.currentTurn += 1;

            // Apply pool-modifying abilities
            const pool = [...battle.letterPool];

            if (ability === 'removes_vowel') {
                const vowelIndices = pool.reduce<number[]>((acc, l, i) => {
                    if (VOWELS.has(l.toUpperCase())) acc.push(i);
                    return acc;
                }, []);
                if (vowelIndices.length > 0) {
                    const removeIdx = vowelIndices[Math.floor(Math.random() * vowelIndices.length)];
                    const removed = pool[removeIdx];
                    pool.splice(removeIdx, 1);
                    abilityMessage = `The enemy devoured the letter ${removed} from your pool!`;
                }
            }

            if (ability === 'steals_letter') {
                if (pool.length > 0) {
                    let bestIdx = 0;
                    let bestScore = 0;
                    for (let i = 0; i < pool.length; i++) {
                        const score = LETTER_SCORES[pool[i].toUpperCase()] ?? 1;
                        if (score > bestScore) {
                            bestScore = score;
                            bestIdx = i;
                        }
                    }
                    const stolen = pool[bestIdx];
                    pool.splice(bestIdx, 1);
                    abilityMessage = `The enemy stole your ${stolen} (${bestScore} pts)!`;
                }
            }

            if (ability === 'time_pressure') {
                battle.turnTimerDeadlineMs = Date.now() + TIME_PRESSURE_DURATION_MS;
                abilityMessage = 'Time Pressure! You have 15 seconds to form a word!';
            }

            battle.letterPool = pool;
            battle.lastAbilityMessage = abilityMessage;

            if (battle.playerHp <= 0) {
                battle.status = 'defeat';
            } else if (battle.currentTurn > battle.maxTurns) {
                battle.status = 'defeat';
            }

            return { arenaBattle: battle };
        }),

    endBattle: (victory: boolean) =>
        set((state) => {
            const stats = { ...state.arenaStats };
            if (victory) {
                stats.battlesWon += 1;
                stats.battleWinStreak += 1;
                stats.bestBattleWinStreak = Math.max(stats.bestBattleWinStreak, stats.battleWinStreak);
            } else {
                stats.battlesLost += 1;
                stats.battleWinStreak = 0;
            }
            return {
                arenaStats: stats,
                arenaBattle: { ...DEFAULT_BATTLE },
            };
        }),

    refreshLetterPool: (newPool: string[]) =>
        set((state) => ({
            arenaBattle: { ...state.arenaBattle, letterPool: newPool },
        })),

    // ── Gauntlet Actions ──

    startGauntlet: (puzzles: GauntletPuzzle[]) =>
        set({
            arenaGauntlet: {
                puzzles,
                currentPuzzleIndex: 0,
                score: 0,
                combo: 0,
                maxCombo: 0,
                timeRemainingMs: GAUNTLET_INITIAL_TIME_MS,
                correctCount: 0,
                incorrectCount: 0,
                vocabBonuses: 0,
                status: 'active',
            },
        }),

    answerGauntletPuzzle: (correct: boolean, isVocabWord: boolean) =>
        set((state) => {
            const g = { ...state.arenaGauntlet };
            if (g.status !== 'active') return state;

            if (correct) {
                const newCombo = g.combo + 1;
                const comboIdx = Math.min(newCombo - 1, GAUNTLET_COMBO_MULTIPLIERS.length - 1);
                const multiplier = GAUNTLET_COMBO_MULTIPLIERS[comboIdx];
                const points = Math.floor(GAUNTLET_BASE_POINTS * multiplier);
                const vocabBonus = isVocabWord ? 50 : 0;

                g.score += points + vocabBonus;
                g.combo = newCombo;
                g.maxCombo = Math.max(g.maxCombo, newCombo);
                g.correctCount += 1;
                if (isVocabWord) g.vocabBonuses += 1;

                // Add bonus time
                const puzzle = g.puzzles[g.currentPuzzleIndex];
                if (puzzle) {
                    g.timeRemainingMs += puzzle.bonusSeconds * 1000;
                }
            } else {
                g.combo = 0;
                g.incorrectCount += 1;
            }

            g.currentPuzzleIndex += 1;

            if (g.currentPuzzleIndex >= g.puzzles.length) {
                g.status = 'finished';
            }

            return { arenaGauntlet: g };
        }),

    tickGauntletTimer: (elapsedMs: number) =>
        set((state) => {
            const g = { ...state.arenaGauntlet };
            if (g.status !== 'active') return state;

            g.timeRemainingMs = Math.max(0, g.timeRemainingMs - elapsedMs);
            if (g.timeRemainingMs <= 0) {
                g.status = 'finished';
            }

            return { arenaGauntlet: g };
        }),

    addGauntletTime: (ms: number) =>
        set((state) => ({
            arenaGauntlet: {
                ...state.arenaGauntlet,
                timeRemainingMs: state.arenaGauntlet.timeRemainingMs + ms,
            },
        })),

    endGauntlet: () =>
        set((state) => {
            const stats = { ...state.arenaStats };
            stats.gauntletTotalPlayed += 1;
            stats.gauntletHighScore = Math.max(stats.gauntletHighScore, state.arenaGauntlet.score);
            return {
                arenaStats: stats,
                arenaGauntlet: { ...DEFAULT_GAUNTLET },
            };
        }),

    // ── Mystery Actions ──

    startMystery: (id: string, title: string, narrative: string, steps: MysteryStep[]) =>
        set({
            arenaMystery: {
                id,
                title,
                narrative,
                steps,
                currentStep: 0,
                hintsUsedTotal: 0,
                startedAt: new Date().toISOString(),
                status: 'active',
            },
        }),

    solveMysteryStep: (stepIndex: number) =>
        set((state) => {
            const m = { ...state.arenaMystery };
            const steps = m.steps.map((s, i) =>
                i === stepIndex ? { ...s, solved: true } : s,
            );
            m.steps = steps;

            const allSolved = steps.every((s) => s.solved);
            if (allSolved) {
                m.status = 'solved';
            } else {
                m.currentStep = stepIndex + 1;
            }

            return { arenaMystery: m };
        }),

    useMysteryHint: (stepIndex: number) =>
        set((state) => {
            const m = { ...state.arenaMystery };
            const steps = m.steps.map((s, i) =>
                i === stepIndex ? { ...s, hintsUsed: s.hintsUsed + 1 } : s,
            );
            m.steps = steps;
            m.hintsUsedTotal += 1;
            return { arenaMystery: m };
        }),

    endMystery: (solved: boolean) =>
        set((state) => {
            const stats = { ...state.arenaStats };
            if (solved) {
                stats.mysteriesSolved += 1;
                stats.detectiveRank = getDetectiveRank(stats.mysteriesSolved);
            }
            return {
                arenaStats: stats,
                arenaMystery: { ...DEFAULT_MYSTERY },
            };
        }),

    abandonMystery: () =>
        set((state) => {
            const stats = { ...state.arenaStats };
            stats.mysteriesAbandoned += 1;
            return {
                arenaStats: stats,
                arenaMystery: { ...DEFAULT_MYSTERY },
            };
        }),

    // ── Shared ──

    setArenaLoading: (loading: boolean) => set({ arenaLoading: loading }),

    resetArenaSession: () =>
        set({
            arenaBattle: { ...DEFAULT_BATTLE },
            arenaGauntlet: { ...DEFAULT_GAUNTLET },
            arenaMystery: { ...DEFAULT_MYSTERY },
        }),
});
