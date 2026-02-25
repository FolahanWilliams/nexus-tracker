/**
 * Unified reward calculator.
 *
 * Centralises every multiplier that can affect XP, gold, or boss damage
 * into a single, predictable pipeline.  All call-sites that award rewards
 * should feed through `calculateReward()` so the breakdown is consistent.
 *
 * Multiplier sources (applied multiplicatively, in order):
 *   1. Class bonus         — from CHARACTER_CLASS (constants.ts)
 *   2. Skill bonus         — cumulative from skill tree levels
 *   3. Active buffs        — temporary potions / scrolls
 *   4. Vocab mastery bonus — cross-domain reward for mastered words
 *   5. Lucky star proc     — random chance to double (rolled last)
 */

import { CLASS_BONUSES, type CharacterClass } from './constants';
import type { Skill } from '@/store/types';

// ─── Vocab mastery → boss damage thresholds ─────────────────────
// Every MASTERY_STEP mastered words gives +MASTERY_BONUS_PER_STEP to boss damage.
export const VOCAB_MASTERY_BOSS_STEP = 5;
export const VOCAB_MASTERY_BOSS_BONUS_PER_STEP = 0.05; // +5 % per step
export const VOCAB_MASTERY_BOSS_MAX_BONUS = 0.50;       // cap at +50 %

// ─── Class respec cost ──────────────────────────────────────────
export const CLASS_RESPEC_GOLD_COST = 200;

// ─── Types ──────────────────────────────────────────────────────

export interface RewardContext {
    characterClass: CharacterClass;
    skills: Skill[];
    activeBuffs: { type: string; value: number; expiresAt: string }[];
    vocabMasteredCount: number;
}

export interface RewardBreakdown {
    base: number;
    classMultiplier: number;
    skillMultiplier: number;
    buffMultiplier: number;
    vocabMultiplier: number;
    luckyProc: boolean;
    final: number;
}

// ─── Core calculator ────────────────────────────────────────────

/**
 * Calculate the final reward amount with a full breakdown of every
 * multiplier that was applied.
 *
 * @param base          Raw amount before any multipliers.
 * @param type          'xp' | 'gold' | 'boss' — determines which multipliers apply.
 * @param ctx           The player's current multiplier sources.
 * @param skipLucky     If true, never proc lucky star (useful for previews).
 */
export function calculateReward(
    base: number,
    type: 'xp' | 'gold' | 'boss',
    ctx: RewardContext,
    skipLucky = false,
): RewardBreakdown {
    let amount = base;
    const breakdown: RewardBreakdown = {
        base,
        classMultiplier: 1,
        skillMultiplier: 1,
        buffMultiplier: 1,
        vocabMultiplier: 1,
        luckyProc: false,
        final: base,
    };

    if (amount <= 0) {
        breakdown.final = amount;
        return breakdown;
    }

    // 1. Class bonus
    if (ctx.characterClass) {
        const bonus = CLASS_BONUSES[ctx.characterClass];
        const mult =
            type === 'xp' ? bonus.xpMultiplier
                : type === 'gold' ? bonus.goldMultiplier
                    : bonus.bossMultiplier;
        breakdown.classMultiplier = mult;
        amount = Math.floor(amount * mult);
    }

    // 2. Skill bonuses
    if (type === 'xp' || type === 'gold') {
        let skillMult = 1;
        for (const skill of ctx.skills) {
            if (skill.currentLevel <= 0) continue;
            if (type === 'xp' && skill.effects.xpMultiplier) {
                skillMult += skill.effects.xpMultiplier * skill.currentLevel;
            }
            if (type === 'gold' && skill.effects.goldMultiplier) {
                skillMult += skill.effects.goldMultiplier * skill.currentLevel;
            }
        }
        breakdown.skillMultiplier = skillMult;
        amount = Math.floor(amount * skillMult);
    }

    if (type === 'boss') {
        // Boss-slayer skill uses its own formula (quadratic)
        const bossSlayer = ctx.skills.find(s => s.id === 'boss-slayer');
        if (bossSlayer && bossSlayer.currentLevel > 0) {
            const mult = 1 + bossSlayer.currentLevel * 0.05 * bossSlayer.currentLevel;
            breakdown.skillMultiplier = mult;
            amount = Math.floor(amount * mult);
        }
    }

    // 3. Active buffs
    let buffMult = 1;
    for (const buff of ctx.activeBuffs) {
        if (new Date(buff.expiresAt) <= new Date()) continue; // expired
        if (type === 'boss') continue; // buffs don't affect raw boss damage
        if (buff.type === type || buff.type === 'buff') {
            buffMult *= buff.value;
        }
    }
    breakdown.buffMultiplier = buffMult;
    amount = Math.floor(amount * buffMult);

    // 4. Vocab mastery → boss damage bonus (cross-domain reward)
    if (type === 'boss' && ctx.vocabMasteredCount > 0) {
        const steps = Math.floor(ctx.vocabMasteredCount / VOCAB_MASTERY_BOSS_STEP);
        const bonus = Math.min(steps * VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS);
        if (bonus > 0) {
            breakdown.vocabMultiplier = 1 + bonus;
            amount = Math.floor(amount * (1 + bonus));
        }
    }

    // 5. Lucky star proc (only for XP/gold, not boss damage)
    if (!skipLucky && type !== 'boss') {
        const luckySkill = ctx.skills.find(s => s.id === 'lucky-star');
        if (luckySkill && luckySkill.currentLevel > 0 && Math.random() < luckySkill.currentLevel * 0.05) {
            amount *= 2;
            breakdown.luckyProc = true;
        }
    }

    breakdown.final = amount;
    return breakdown;
}

// ─── Helper: build context from store state ─────────────────────

/**
 * Build a `RewardContext` from the game store state.
 * This avoids every call-site having to manually pick fields.
 */
export function buildRewardContext(state: {
    characterClass: CharacterClass;
    skills: Skill[];
    activeBuffs: { type: string; value: number; expiresAt: string }[];
    vocabWords: { status: string }[];
}): RewardContext {
    return {
        characterClass: state.characterClass,
        skills: state.skills,
        activeBuffs: state.activeBuffs,
        vocabMasteredCount: state.vocabWords.filter(w => w.status === 'mastered').length,
    };
}

// ─── Preview helpers (for UI display) ───────────────────────────

/** Calculate all class bonuses for a preview comparison table. */
export function previewAllClasses(ctx: Omit<RewardContext, 'characterClass'>, base: number): Record<string, { xp: number; gold: number; boss: number }> {
    const classes: NonNullable<CharacterClass>[] = ['Scholar', 'Strategist', 'Warrior', 'Merchant', 'Creator'];
    const result: Record<string, { xp: number; gold: number; boss: number }> = {};
    for (const cls of classes) {
        const fullCtx: RewardContext = { ...ctx, characterClass: cls };
        result[cls] = {
            xp: calculateReward(base, 'xp', fullCtx, true).final,
            gold: calculateReward(base, 'gold', fullCtx, true).final,
            boss: calculateReward(base, 'boss', fullCtx, true).final,
        };
    }
    return result;
}
