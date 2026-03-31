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

// ─── Habit SM-2 Scheduling ───────────────────────────────────────

/** Default ease factor for new habits. */
export const HABIT_SM2_DEFAULT_EASE = 2.5;

/** Minimum ease factor for habits. */
export const HABIT_SM2_MIN_EASE = 1.3;

/** Maximum ease factor for habits. */
export const HABIT_SM2_MAX_EASE = 3.0;

/** Maximum interval (days) for habit focus reminders. */
export const HABIT_SM2_MAX_INTERVAL = 7;

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

// ─── HITS (Horizontal Intelligence Training) ───────────────────

import type { KnowledgePillar, CognitiveFailureMode } from '@/store/types';

export const HITS_BLOCK_XP = { A: 40, B: 25, C: 50, D: 20, E: 30 } as const;
export const HITS_BLOCK_GOLD = { A: 8, B: 5, C: 10, D: 4, E: 6 } as const;
export const HITS_FULL_SESSION_BONUS = { xp: 50, gold: 10 } as const;
export const HITS_WEEKLY_SYNTHESIS_XP = 100;
export const HITS_WEEKLY_SYNTHESIS_GOLD = 20;
export const HITS_MONTHLY_CHALLENGE_XP = 200;
export const HITS_MONTHLY_CHALLENGE_GOLD = 50;
export const HITS_BIWEEKLY_ESSAY_XP = 150;
export const HITS_BIWEEKLY_ESSAY_GOLD = 30;

export const HITS_PILLAR_SCHEDULE: Record<number, KnowledgePillar> = {
    1: 'psychology',
    2: 'strategy',
    3: 'systems',
    4: 'probability',
    5: 'communication',
    6: 'tech',
    0: 'synthesis',
};

export const HITS_PILLAR_LABELS: Record<KnowledgePillar, string> = {
    psychology: 'Psychology & Behavioral Science',
    strategy: 'Strategy & Business',
    systems: 'Systems Thinking',
    probability: 'Probability & Decision Theory',
    communication: 'Communication & Sales',
    tech: 'Tech & AI',
    synthesis: 'Synthesis & Review',
};

export const HITS_PILLAR_COLORS: Record<KnowledgePillar, string> = {
    psychology: '#f472b6',
    strategy: '#fb923c',
    systems: '#34d399',
    probability: '#60a5fa',
    communication: '#a78bfa',
    tech: '#22d3ee',
    synthesis: '#fbbf24',
};

export const HITS_COGNITIVE_FAILURES: Record<CognitiveFailureMode, string> = {
    rushed: 'I rushed and didn\'t understand',
    overconsumed: 'I overconsumed and didn\'t output',
    avoided_hard_thinking: 'I avoided hard thinking',
    stayed_abstract: 'I stayed abstract and didn\'t apply',
    no_test: 'I didn\'t test my understanding',
    confused_familiarity: 'I confused familiarity with mastery',
};

export const HITS_REFLECTION_QUESTIONS = [
    'What did I misunderstand at first?',
    'Where did I feel resistance or confusion?',
    'What was easy today? Why?',
    'What pattern do I notice in how I learn?',
    'What is the one thing I would teach someone else?',
    'What did I do that was inefficient?',
    'What should I change tomorrow?',
] as const;

export const HITS_SCOREBOARD_TARGETS = {
    modelCards: 7,
    speakingReps: 1,
    essays: 1,
    synthesis: 1,
    founderDocs: 1,
    deepWorkSprints: 2,
} as const;

export const HITS_MODEL_CARDS_MAX = 500;
export const HITS_OUTPUTS_MAX = 200;
export const HITS_REFLECTIONS_MAX = 365;

// ─── Bounded Arrays ─────────────────────────────────────────────

/** Maximum entries kept in the activity log. */
export const ACTIVITY_LOG_MAX_ENTRIES = 500;

/**
 * Maximum number of completedDates entries kept per habit.
 * ~1 year of daily completions. Older entries are trimmed on each completion.
 */
export const HABIT_COMPLETED_DATES_MAX = 365;
