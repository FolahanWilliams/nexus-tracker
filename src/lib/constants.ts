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

// ─── XP Curve ────────────────────────────────────────────────────

/** XP needed to reach a given level (cumulative). Level 1 = 0. */
export function xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(50 * Math.pow(level - 1, 1.8));
}

/** Derive level from total XP using the XP curve. */
export function levelFromXP(xp: number): number {
    let level = 1;
    while (xpForLevel(level + 1) <= xp) {
        level++;
        if (level >= 100) break;
    }
    return level;
}

// ─── Class Bonuses ───────────────────────────────────────────────

export type CharacterClass = 'Scholar' | 'Strategist' | 'Warrior' | 'Merchant' | 'Creator' | null;

export const CLASS_BONUSES: Record<NonNullable<CharacterClass>, { xpMultiplier: number; goldMultiplier: number; bossMultiplier: number; dropBonus: number; description: string }> = {
    Scholar: { xpMultiplier: 1.20, goldMultiplier: 1.00, bossMultiplier: 1.00, dropBonus: 0.00, description: '+20% XP from all quests' },
    Strategist: { xpMultiplier: 1.10, goldMultiplier: 1.10, bossMultiplier: 1.15, dropBonus: 0.00, description: '+10% XP & Gold, +15% boss damage' },
    Warrior: { xpMultiplier: 1.00, goldMultiplier: 1.00, bossMultiplier: 1.30, dropBonus: 0.05, description: '+30% boss damage, +5% item drop chance' },
    Merchant: { xpMultiplier: 1.00, goldMultiplier: 1.25, bossMultiplier: 1.00, dropBonus: 0.05, description: '+25% Gold from all quests, +5% item drop chance' },
    Creator: { xpMultiplier: 1.15, goldMultiplier: 1.15, bossMultiplier: 1.00, dropBonus: 0.10, description: '+15% XP & Gold, +10% item drop chance' },
};

// ─── Title Progression ───────────────────────────────────────────

export type Title = 'Novice' | 'Apprentice' | 'Journeyman' | 'Expert' | 'Master' | 'Grandmaster' | 'Legend';

export const TITLE_REQUIREMENTS: Record<Title, { level: number; quests: number; streaks: number }> = {
    'Novice': { level: 1, quests: 0, streaks: 0 },
    'Apprentice': { level: 3, quests: 10, streaks: 3 },
    'Journeyman': { level: 5, quests: 25, streaks: 7 },
    'Expert': { level: 10, quests: 50, streaks: 14 },
    'Master': { level: 20, quests: 100, streaks: 30 },
    'Grandmaster': { level: 35, quests: 200, streaks: 60 },
    'Legend': { level: 50, quests: 500, streaks: 100 },
};

// ─── Daily Rewards ───────────────────────────────────────────────

export const DAILY_REWARDS = [
    { day: 1, gold: 50, gems: 5 },
    { day: 2, gold: 75, gems: 5 },
    { day: 3, gold: 100, gems: 10 },
    { day: 4, gold: 125, gems: 10 },
    { day: 5, gold: 150, gems: 15 },
    { day: 6, gold: 175, gems: 20 },
    { day: 7, gold: 250, gems: 50 },
];

// ─── Daily Quest Templates ──────────────────────────────────────

export const DAILY_QUEST_TEMPLATES = [
    { title: 'Complete 3 quests', difficulty: 'Easy' as const, xp: 30 },
    { title: 'Complete a Hard quest', difficulty: 'Hard' as const, xp: 50 },
    { title: 'Complete 5 quests', difficulty: 'Medium' as const, xp: 75 },
    { title: 'Earn 100 gold', difficulty: 'Easy' as const, xp: 25 },
    { title: 'Complete an Epic quest', difficulty: 'Epic' as const, xp: 100 },
    { title: 'Use an item from inventory', difficulty: 'Easy' as const, xp: 20 },
    { title: 'Equip a weapon', difficulty: 'Easy' as const, xp: 15 },
    { title: 'Upgrade a skill', difficulty: 'Medium' as const, xp: 40 },
    { title: 'Complete a quest chain step', difficulty: 'Medium' as const, xp: 35 },
];

// ─── Bounded Arrays ─────────────────────────────────────────────

/** Maximum entries kept in the activity log. */
export const ACTIVITY_LOG_MAX_ENTRIES = 500;

/**
 * Maximum number of completedDates entries kept per habit.
 * ~1 year of daily completions. Older entries are trimmed on each completion.
 */
export const HABIT_COMPLETED_DATES_MAX = 365;
