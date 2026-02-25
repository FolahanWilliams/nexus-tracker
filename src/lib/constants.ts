/**
 * Centralised game-balance constants.
 *
 * All magic numbers that affect XP, gold, difficulty thresholds, spaced
 * repetition tuning, etc. live here so they can be tuned in one place.
 */

// ─── XP & Gold ───────────────────────────────────────────────────

/** Base XP awarded per task difficulty. */
export const DIFFICULTY_XP: Record<string, number> = {
    Easy: 10,
    Medium: 25,
    Hard: 50,
    Epic: 100,
};

// ─── Vocabulary / WordForge ──────────────────────────────────────

/** XP for generating a new daily word batch. */
export const VOCAB_DAILY_GENERATION_XP = 20;

/** Number of words generated per daily batch. */
export const VOCAB_DAILY_WORD_COUNT = 4;

/** XP awarded per vocab review by quality tier. */
export const VOCAB_REVIEW_XP = {
    high: 15,   // quality >= 4
    mid: 10,    // quality >= 3
    low: 5,     // quality < 3
} as const;

/** Gold awarded per vocab review. */
export const VOCAB_REVIEW_GOLD = {
    correct: 3,  // quality >= 3
    incorrect: 1,
} as const;

/** Bonus XP + gold for mastering a word. */
export const VOCAB_MASTERY_BONUS = { xp: 50, gold: 20 } as const;

// ─── SM-2 Spaced Repetition Tuning ──────────────────────────────

/** Minimum ease factor (SM-2). */
export const SM2_MIN_EASE = 1.3;

/** Maximum ease factor (SM-2). */
export const SM2_MAX_EASE = 3.0;

/** Default ease factor for new words. */
export const SM2_DEFAULT_EASE = 2.5;

/** Maximum interval in days before capping. */
export const SM2_MAX_INTERVAL = 365;

/** Minimum repetitions to enter "reviewing" status. */
export const SM2_REVIEWING_REPS = 3;

/** Minimum interval (days) to be considered "mastered". */
export const SM2_MASTERY_INTERVAL = 21;

// ─── Auto-Levelling Thresholds ───────────────────────────────────

/** Accuracy above this promotes to the next difficulty level. */
export const VOCAB_LEVEL_UP_ACCURACY = 0.80;

/** Accuracy below this demotes to the previous difficulty level. */
export const VOCAB_LEVEL_DOWN_ACCURACY = 0.50;

/** Minimum words mastered at current level before promotion. */
export const VOCAB_LEVEL_UP_MASTERED_MIN = 5;

/** Minimum recently reviewed words needed before level evaluation. */
export const VOCAB_LEVEL_EVAL_MIN_REVIEWED = 5;

/** Number of recent reviews to sample for level evaluation. */
export const VOCAB_LEVEL_EVAL_SAMPLE_SIZE = 20;

/** Minimum total vocab words before auto-levelling kicks in. */
export const VOCAB_LEVEL_EVAL_MIN_WORDS = 10;

// ─── Activity Log ────────────────────────────────────────────────

/** Maximum entries kept in the activity log. */
export const ACTIVITY_LOG_MAX_ENTRIES = 500;
