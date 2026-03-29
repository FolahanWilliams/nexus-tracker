/**
 * Balance constants for the Arena word game modes.
 */

import type { ArenaDifficulty, DetectiveRank } from '@/store/types';

// ─── Letter scoring (Scrabble-inspired) ─────────────────────────

export const LETTER_SCORES: Record<string, number> = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4,
    I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3,
    Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
    Y: 4, Z: 10,
};

/** Rarity tier for visual styling of letter tiles */
export function getLetterRarity(letter: string): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    const score = LETTER_SCORES[letter.toUpperCase()] ?? 1;
    if (score >= 10) return 'legendary';
    if (score >= 8) return 'epic';
    if (score >= 4) return 'rare';
    if (score >= 3) return 'uncommon';
    return 'common';
}

// ─── Letter pool generation weights ─────────────────────────────

/** Frequency weights for generating letter pools (higher = more likely) */
export const LETTER_FREQUENCIES: Record<string, number> = {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2,
    I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2,
    Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1,
    Y: 2, Z: 1,
};

// ─── Battle constants ───────────────────────────────────────────

export const BATTLE_CONFIG: Record<ArenaDifficulty, {
    poolSize: number;
    enemyHpRange: [number, number];
    enemyDamageRange: [number, number];
    maxTurns: number;
    baseXp: number;
    baseGold: number;
}> = {
    easy:      { poolSize: 10, enemyHpRange: [50, 80],   enemyDamageRange: [5, 10],  maxTurns: 5,  baseXp: 30,  baseGold: 15 },
    medium:    { poolSize: 10, enemyHpRange: [80, 120],  enemyDamageRange: [10, 15], maxTurns: 7,  baseXp: 50,  baseGold: 25 },
    hard:      { poolSize: 9,  enemyHpRange: [120, 180], enemyDamageRange: [15, 25], maxTurns: 10, baseXp: 80,  baseGold: 40 },
    legendary: { poolSize: 8,  enemyHpRange: [180, 250], enemyDamageRange: [20, 35], maxTurns: 12, baseXp: 120, baseGold: 60 },
};

export const PLAYER_MAX_HP = 100;
export const VOCAB_STRIKE_MULTIPLIER = 1.5;
export const BASE_WORD_DAMAGE_PER_LENGTH = 5;

/** Calculate word damage from letters used */
export function calculateWordDamage(word: string): number {
    const lengthDamage = word.length * BASE_WORD_DAMAGE_PER_LENGTH;
    const rarityBonus = word
        .toUpperCase()
        .split('')
        .reduce((sum, ch) => sum + (LETTER_SCORES[ch] ?? 1), 0);
    return lengthDamage + rarityBonus;
}

// ─── Gauntlet constants ─────────────────────────────────────────

export const GAUNTLET_INITIAL_TIME_MS = 180_000; // 3 minutes
export const GAUNTLET_BONUS_SECONDS: Record<ArenaDifficulty, number> = {
    easy: 5,
    medium: 3,
    hard: 2,
    legendary: 1,
};
export const GAUNTLET_COMBO_MULTIPLIERS = [1, 1.5, 2, 2.5, 3];
export const GAUNTLET_BASE_POINTS = 100;
export const GAUNTLET_XP_PER_POINT = 0.5;
export const GAUNTLET_GOLD_PER_POINT = 0.25;

// ─── Mystery constants ──────────────────────────────────────────

export const MYSTERY_HINT_COSTS = [0, 10, 25] as const;
export const MYSTERY_HINT_REWARD_PENALTY = 0.10; // -10% per hint
export const MYSTERY_BASE_XP: Record<ArenaDifficulty, number> = {
    easy: 40,
    medium: 70,
    hard: 100,
    legendary: 150,
};
export const MYSTERY_BASE_GOLD: Record<ArenaDifficulty, number> = {
    easy: 20,
    medium: 35,
    hard: 50,
    legendary: 75,
};

export const DETECTIVE_RANK_THRESHOLDS: { rank: DetectiveRank; required: number }[] = [
    { rank: 'Novice', required: 0 },
    { rank: 'Sleuth', required: 3 },
    { rank: 'Inspector', required: 10 },
    { rank: 'Detective', required: 25 },
    { rank: 'Mastermind', required: 50 },
];

export function getDetectiveRank(mysteriesSolved: number): DetectiveRank {
    let rank: DetectiveRank = 'Novice';
    for (const tier of DETECTIVE_RANK_THRESHOLDS) {
        if (mysteriesSolved >= tier.required) rank = tier.rank;
    }
    return rank;
}

// ─── Item drop tables ───────────────────────────────────────────

export const ARENA_LOOT_CHANCE: Record<ArenaDifficulty, number> = {
    easy: 0.15,
    medium: 0.25,
    hard: 0.40,
    legendary: 0.60,
};

// ─── Time pressure ability ──────────────────────────────────────

export const TIME_PRESSURE_DURATION_MS = 15_000;
