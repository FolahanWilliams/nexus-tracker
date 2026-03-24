import type { StateCreator } from 'zustand';
import type { GameState, RpgSlice, InventoryItem, CraftingRecipe, QuestChain, PrestigeState, PassiveAbility } from '../types';
import { validateShopItemName, validateCost, ValidationError } from '@/lib/validation';
import { logger } from '@/lib/logger';

// ─── Prestige Config ────────────────────────────────────────────
export const PRESTIGE_MIN_LEVEL = 50;
export const PRESTIGE_MULTIPLIER_PER_LEVEL = 0.1; // +10% per prestige

const DEFAULT_PRESTIGE: PrestigeState = {
    level: 0,
    permanentMultiplier: 1,
    lifetimeXpEarned: 0,
    lastPrestigeAt: null,
};

const CRAFTING_RECIPES: CraftingRecipe[] = [
    { id: 'health-potion', name: 'Health Potion', description: 'Restores HP', icon: '🧪', rarity: 'Common', inputs: [{ itemId: 'herbs', quantity: 2 }], output: { name: 'Health Potion', description: 'Restores 50 HP', type: 'consumable', rarity: 'Common', icon: '🧪', quantity: 1, stats: { hpRestore: 50 }, usable: true, consumableEffect: { type: 'heal', value: 50 } } },
    { id: 'xp-scroll', name: 'XP Scroll', description: 'Grants bonus XP', icon: '📜', rarity: 'Uncommon', inputs: [{ itemId: 'magic-ink', quantity: 2 }, { itemId: 'parchment', quantity: 1 }], output: { name: 'XP Scroll', description: 'Grants 50 XP', type: 'consumable', rarity: 'Uncommon', icon: '📜', quantity: 1, stats: { xpBonus: 50 }, usable: true, consumableEffect: { type: 'xp', value: 50 } } },
    { id: 'gold-pouch', name: 'Gold Pouch', description: 'Grants bonus gold', icon: '💰', rarity: 'Uncommon', inputs: [{ itemId: 'gold-coin', quantity: 5 }], output: { name: 'Gold Pouch', description: 'Grants 100 Gold', type: 'consumable', rarity: 'Uncommon', icon: '💰', quantity: 1, stats: { goldBonus: 100 }, usable: true, consumableEffect: { type: 'gold', value: 100 } } },
    { id: 'legendary-weapon', name: 'Legendary Blade', description: 'A blade of great power', icon: '⚔️', rarity: 'Legendary', inputs: [{ itemId: 'dragon-scale', quantity: 3 }, { itemId: 'mithril', quantity: 5 }, { itemId: 'magic-ink', quantity: 3 }], output: { name: 'Legendary Blade', description: 'Legendary weapon with +50 XP and +25 Gold bonuses', type: 'weapon', rarity: 'Legendary', icon: '⚔️', quantity: 1, stats: { xpBonus: 50, goldBonus: 25, damage: 100 } } },
    { id: 'epic-armor', name: 'Epic Shield', description: 'A powerful defensive item', icon: '🛡️', rarity: 'Epic', inputs: [{ itemId: 'dragon-scale', quantity: 2 }, { itemId: 'iron-ingot', quantity: 3 }], output: { name: 'Epic Shield', description: 'Epic armor with +30 XP and +15 Gold bonuses', type: 'armor', rarity: 'Epic', icon: '🛡️', quantity: 1, stats: { xpBonus: 30, goldBonus: 15, defense: 50 } } },
    { id: 'buff-potion', name: 'Buff Potion', description: 'Temporary stat boost', icon: '🧉', rarity: 'Rare', inputs: [{ itemId: 'magic-ink', quantity: 1 }, { itemId: 'herbs', quantity: 3 }], output: { name: 'Buff Potion', description: '2x XP for 30 minutes', type: 'consumable', rarity: 'Rare', icon: '🧉', quantity: 1, usable: true, consumableEffect: { type: 'buff', value: 2, duration: 30 } } },
];

const DEFAULT_SKILLS = [
    // ── Original Core Skills ──
    { id: 'productive-mind', name: 'Productive Mind', description: 'Gain 10% more XP from all quests', icon: 'brain', maxLevel: 5, currentLevel: 0, unlocked: true, prerequisites: [] as string[], cost: 100, category: 'productivity' as const, effects: { xpMultiplier: 0.1 } },
    { id: 'gold-rush', name: 'Gold Rush', description: 'Earn 15% more gold from quests', icon: 'coins', maxLevel: 5, currentLevel: 0, unlocked: true, prerequisites: [] as string[], cost: 100, category: 'crafting' as const, effects: { goldMultiplier: 0.15 } },
    { id: 'streak-master', name: 'Streak Master', description: 'Streak bonuses are 20% more effective', icon: 'flame', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['productive-mind'], cost: 250, category: 'productivity' as const, effects: {} },
    { id: 'task-efficiency', name: 'Task Efficiency', description: 'Complete tasks 10% faster', icon: 'zap', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['productive-mind', 'gold-rush'], cost: 300, category: 'productivity' as const, effects: { taskEfficiency: 0.1 } },
    { id: 'boss-slayer', name: 'Boss Slayer', description: 'Deal 25% more damage to bosses', icon: 'sword', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['task-efficiency'], cost: 400, category: 'combat' as const, effects: {} },
    { id: 'lucky-star', name: 'Lucky Star', description: '15% chance to get double rewards', icon: 'star', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['gold-rush'], cost: 350, category: 'magic' as const, effects: {} },

    // ── Productivity Specialization ──
    { id: 'deep-focus', name: 'Deep Focus', description: 'Focus sessions yield 15% more XP', icon: 'target', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['task-efficiency'], cost: 350, category: 'productivity' as const, specialization: 'Productivity' as const, effects: { xpMultiplier: 0.15 }, passive: { type: 'focus_burst' as const, description: 'Focus sessions over 25 min grant a bonus 50 XP', activationLevel: 3 } },
    { id: 'auto-pilot', name: 'Auto-Pilot', description: 'Easy habits can auto-complete once per day', icon: 'zap', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['streak-master'], cost: 500, category: 'productivity' as const, specialization: 'Productivity' as const, effects: {}, passive: { type: 'auto_complete_easy' as const, description: 'One easy habit auto-completes daily', activationLevel: 1 } },
    { id: 'time-lord', name: 'Time Lord', description: 'Task efficiency boosted by 15%', icon: 'zap', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['deep-focus', 'auto-pilot'], cost: 600, category: 'productivity' as const, specialization: 'Productivity' as const, effects: { taskEfficiency: 0.15 } },

    // ── Creativity Specialization ──
    { id: 'creative-spark', name: 'Creative Spark', description: 'Creative tasks yield 20% more gold', icon: 'star', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['gold-rush'], cost: 300, category: 'crafting' as const, specialization: 'Creativity' as const, effects: { goldMultiplier: 0.2 }, passive: { type: 'creative_spark' as const, description: 'Creative category tasks have 10% chance for rare item drops', activationLevel: 3 } },
    { id: 'muse-call', name: 'Muse\'s Call', description: 'Crafting recipes cost 20% fewer materials', icon: 'star', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['creative-spark'], cost: 450, category: 'crafting' as const, specialization: 'Creativity' as const, effects: {} },
    { id: 'masterwork', name: 'Masterwork', description: 'Crafted items have enhanced stats', icon: 'star', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['muse-call'], cost: 600, category: 'crafting' as const, specialization: 'Creativity' as const, effects: { goldMultiplier: 0.1 } },

    // ── Learning Specialization ──
    { id: 'quick-study', name: 'Quick Study', description: 'Vocab reviews grant 15% more XP', icon: 'brain', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['productive-mind'], cost: 300, category: 'magic' as const, specialization: 'Learning' as const, effects: { xpMultiplier: 0.15 }, passive: { type: 'knowledge_retention' as const, description: 'Spaced repetition intervals extended by 20%', activationLevel: 3 } },
    { id: 'memory-palace', name: 'Memory Palace', description: 'Review streak bonuses doubled', icon: 'brain', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['quick-study'], cost: 450, category: 'magic' as const, specialization: 'Learning' as const, effects: {} },
    { id: 'polymath', name: 'Polymath', description: 'Cross-domain XP bonus: +10% per active specialization', icon: 'brain', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['memory-palace', 'lucky-star'], cost: 700, category: 'magic' as const, specialization: 'Learning' as const, effects: { xpMultiplier: 0.1 } },

    // ── Fitness Specialization ──
    { id: 'iron-will', name: 'Iron Will', description: 'Health habits grant 20% more XP', icon: 'flame', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['streak-master'], cost: 300, category: 'combat' as const, specialization: 'Fitness' as const, effects: { xpMultiplier: 0.2 } },
    { id: 'streak-shield', name: 'Streak Shield', description: 'Protect one streak from breaking per week', icon: 'flame', maxLevel: 3, currentLevel: 0, unlocked: false, prerequisites: ['iron-will'], cost: 500, category: 'combat' as const, specialization: 'Fitness' as const, effects: {}, passive: { type: 'streak_shield' as const, description: 'One missed day per week won\'t break your streak', activationLevel: 1 } },
    { id: 'endurance', name: 'Endurance', description: 'Boss battles deal more damage; weekend XP doubled', icon: 'flame', maxLevel: 5, currentLevel: 0, unlocked: false, prerequisites: ['streak-shield', 'boss-slayer'], cost: 650, category: 'combat' as const, specialization: 'Fitness' as const, effects: {}, passive: { type: 'double_xp_weekends' as const, description: 'All XP rewards doubled on weekends', activationLevel: 3 } },
];

export const createRpgSlice: StateCreator<GameState, [], [], RpgSlice> = (set, get) => ({
    // ── State ──
    inventory: [],
    skills: DEFAULT_SKILLS,
    questChains: [],
    craftingRecipes: CRAFTING_RECIPES,
    equippedItems: {},
    activeBuffs: [],
    shopItems: [],
    purchasedRewards: [],
    prestige: DEFAULT_PRESTIGE,

    // ── Inventory Actions ──
    addItem: (item) => {
        const newItem: InventoryItem = { ...item, id: crypto.randomUUID() };
        set((state) => ({ inventory: [...state.inventory, newItem] }));
    },

    removeItem: (id, quantity = 1) => {
        set((state) => {
            const item = state.inventory.find(i => i.id === id);
            if (!item) return state;
            if (item.quantity <= quantity) {
                return {
                    inventory: state.inventory.filter(i => i.id !== id),
                    equippedItems: {
                        ...state.equippedItems,
                        [item.type]: state.equippedItems[item.type as keyof typeof state.equippedItems]?.id === id
                            ? undefined : state.equippedItems[item.type as keyof typeof state.equippedItems]
                    }
                };
            }
            return { inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: i.quantity - quantity } : i) };
        });
    },

    equipItem: (id) => {
        set((state) => {
            const item = state.inventory.find(i => i.id === id);
            if (!item) return state;
            return {
                inventory: state.inventory.map(i => i.id === id ? { ...i, equipped: true } : i.type === item.type ? { ...i, equipped: false } : i),
                equippedItems: { ...state.equippedItems, [item.type]: item }
            };
        });
    },

    unequipItem: (type) => {
        set((state) => ({
            inventory: state.inventory.map(i => i.type === type ? { ...i, equipped: false } : i),
            equippedItems: { ...state.equippedItems, [type]: undefined }
        }));
    },

    useItem: (id) => {
        const state = get();
        const item = state.inventory.find(i => i.id === id);
        if (!item || !item.usable) return;

        if (item.consumableEffect) {
            const { type, value, duration } = item.consumableEffect;
            if (type === 'xp') state.addXP(value);
            else if (type === 'gold') state.addGold(value);
            else if (type === 'heal') set((s) => ({ hp: Math.min(s.maxHp, s.hp + value) }));
            else if (type === 'buff' && duration) state.addBuff('buff', value, duration);
        } else {
            // Only apply stat bonuses for non-consumable items (passive gear)
            if (item.stats?.xpBonus) state.addXP(item.stats.xpBonus);
            if (item.stats?.goldBonus) state.addGold(item.stats.goldBonus);
        }

        state.removeItem(id, 1);
        get().unlockAchievement('CRAFTSMAN');
    },

    // ── Skill Actions ──
    upgradeSkill: (skillId) => {
        set((state) => {
            const skill = state.skills.find(s => s.id === skillId);
            if (!skill || !skill.unlocked || skill.currentLevel >= skill.maxLevel) return state;
            const cost = skill.cost * (skill.currentLevel + 1);
            if (state.gold < cost) return state;
            return { gold: state.gold - cost, skills: state.skills.map(s => s.id === skillId ? { ...s, currentLevel: s.currentLevel + 1 } : s) };
        });
    },

    unlockSkill: (skillId) => {
        set((state) => {
            const skill = state.skills.find(s => s.id === skillId);
            if (!skill || skill.unlocked) return state;
            const prereqsMet = skill.prerequisites.every(prereqId => state.skills.find(s => s.id === prereqId)?.unlocked);
            if (!prereqsMet) return state;
            return { skills: state.skills.map(s => s.id === skillId ? { ...s, unlocked: true } : s) };
        });
    },

    resetSkill: (skillId) => {
        set((state) => {
            const skill = state.skills.find(s => s.id === skillId);
            if (!skill || skill.currentLevel === 0) return state;
            const xpRefund = Math.floor(Array.from({ length: skill.currentLevel }, (_, i) => skill.cost * (i + 1)).reduce((a, b) => a + b, 0) * 0.7);
            return { xp: state.xp + xpRefund, skills: state.skills.map(s => s.id === skillId ? { ...s, currentLevel: 0 } : s) };
        });
    },

    getSkillMultiplier: (type) => {
        const state = get();
        let multiplier = 1;
        state.skills.forEach(skill => {
            if (skill.currentLevel > 0) {
                if (type === 'xp' && skill.effects.xpMultiplier) multiplier += skill.effects.xpMultiplier * skill.currentLevel;
                if (type === 'gold' && skill.effects.goldMultiplier) multiplier += skill.effects.goldMultiplier * skill.currentLevel;
            }
        });
        state.activeBuffs.forEach(buff => {
            if (buff.type === type || buff.type === 'buff') multiplier *= buff.value;
        });
        return multiplier;
    },

    getActivePassives: () => {
        const state = get();
        const passives: PassiveAbility[] = [];
        for (const skill of state.skills) {
            if (skill.passive && skill.currentLevel >= skill.passive.activationLevel) {
                passives.push(skill.passive);
            }
        }
        return passives;
    },

    hasPassive: (type) => {
        const state = get();
        return state.skills.some(s => s.passive?.type === type && s.currentLevel >= (s.passive?.activationLevel ?? 999));
    },

    prestigeReset: () => {
        const state = get();
        if (state.level < PRESTIGE_MIN_LEVEL) return false;
        const newPrestigeLevel = state.prestige.level + 1;
        const newMultiplier = 1 + newPrestigeLevel * PRESTIGE_MULTIPLIER_PER_LEVEL;
        set({
            // Reset progression
            xp: 0,
            level: 1,
            gold: 0,
            skills: DEFAULT_SKILLS.map(s => ({ ...s })),
            inventory: [],
            equippedItems: {},
            activeBuffs: [],
            questChains: [],
            // Update prestige
            prestige: {
                level: newPrestigeLevel,
                permanentMultiplier: newMultiplier,
                lifetimeXpEarned: state.prestige.lifetimeXpEarned + state.xp,
                lastPrestigeAt: new Date().toISOString(),
            },
        });
        state.logActivity('level_up', '🌟', `Prestige ${newPrestigeLevel}! Permanent x${newMultiplier.toFixed(1)} multiplier`, `+${(PRESTIGE_MULTIPLIER_PER_LEVEL * 100).toFixed(0)}% forever`);
        return true;
    },

    // ── Crafting ──
    craftItem: (recipeId) => {
        const state = get();
        const recipe = state.craftingRecipes.find(r => r.id === recipeId);
        if (!recipe) return false;

        const normalizeId = (id: string) => id.replace(/-/g, ' ');
        const findItem = (itemId: string) => state.inventory.find(i => i.id === itemId || i.name.toLowerCase() === normalizeId(itemId));

        for (const input of recipe.inputs) {
            const hasItem = findItem(input.itemId);
            if (!hasItem || hasItem.quantity < input.quantity) return false;
        }

        for (const input of recipe.inputs) {
            const item = get().inventory.find(i => i.id === input.itemId || i.name.toLowerCase() === normalizeId(input.itemId));
            if (item) get().removeItem(item.id, input.quantity);
        }

        get().addItem(recipe.output);
        get().unlockAchievement('CRAFTSMAN');
        return true;
    },

    // ── Buffs ──
    addBuff: (type, value, durationMinutes) => {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
        set((state) => ({
            activeBuffs: [...state.activeBuffs.filter(b => b.type !== type), { type, value, expiresAt: expiresAt.toISOString() }]
        }));
    },

    checkBuffs: () => {
        const now = new Date();
        set((state) => ({ activeBuffs: state.activeBuffs.filter(buff => new Date(buff.expiresAt) > now) }));
    },

    buyGoldBuff: (type, durationMinutes, goldCost) => {
        let purchased = false;
        set((state) => {
            if (state.gold < goldCost) return state;
            purchased = true;
            return { gold: state.gold - goldCost };
        });
        if (!purchased) return false;
        get().addBuff(type, 1.5, durationMinutes);
        return true;
    },

    // ── Shop ──
    addShopItem: (name, cost) => {
        try {
            const validatedName = validateShopItemName(name);
            const validatedCost = validateCost(cost);
            const newItem = { id: crypto.randomUUID(), name: validatedName, cost: validatedCost, purchased: false };
            set((state) => ({ shopItems: [...state.shopItems, newItem] }));
        } catch (error) {
            if (error instanceof ValidationError) logger.error(`Validation error: ${error.message}`, 'store');
            throw error;
        }
    },

    deleteShopItem: (id) => {
        set((state) => ({ shopItems: state.shopItems.filter(i => i.id !== id) }));
    },

    buyReward: (id) => {
        const state = get();
        const item = state.shopItems.find(i => i.id === id);
        if (item && state.gold >= item.cost) {
            set((state) => ({
                gold: state.gold - item.cost,
                purchasedRewards: [...state.purchasedRewards, { ...item, purchased: true }]
            }));
            get().logActivity('purchase', '🛒', `Purchased "${item.name}"`, `-${item.cost}g`);
        }
    },

    // ── Quest Chains ──
    addQuestChain: (chain) => {
        const newChain: QuestChain = {
            ...chain,
            id: crypto.randomUUID(),
            currentStep: 0,
            completed: false,
            steps: chain.steps.map(step => ({ ...step, id: crypto.randomUUID(), completed: false }))
        };
        set((state) => ({ questChains: [...state.questChains, newChain] }));
    },

    advanceQuestChain: (chainId) => {
        let pendingReward: QuestChain['reward'] | null = null;
        set((state) => {
            const chain = state.questChains.find(c => c.id === chainId);
            if (!chain || chain.completed) return state;
            const nextStep = chain.currentStep + 1;
            const isComplete = nextStep >= chain.steps.length;
            if (isComplete) {
                pendingReward = chain.reward;
                return { questChains: state.questChains.map(c => c.id === chainId ? { ...c, completed: true, currentStep: nextStep } : c) };
            }
            return { questChains: state.questChains.map(c => c.id === chainId ? { ...c, currentStep: nextStep } : c) };
        });
        if (pendingReward) {
            const reward = pendingReward as QuestChain['reward'];
            get().addXP(reward.xp);
            get().addGold(reward.gold);
            if (reward.item) get().addItem(reward.item);
        }
    },

    completeQuestStep: (chainId, stepId) => {
        set((state) => ({
            questChains: state.questChains.map(chain => {
                if (chain.id !== chainId) return chain;
                return { ...chain, steps: chain.steps.map(step => step.id === stepId ? { ...step, completed: true } : step) };
            })
        }));
        get().advanceQuestChain(chainId);
    },

    chooseBranch: (chainId, stepId, branchId) => {
        const chain = get().questChains.find(c => c.id === chainId);
        if (!chain || chain.completed) return;
        const step = chain.steps.find(s => s.id === stepId);
        if (!step || step.completed || !step.branches) return;
        const branch = step.branches.find(b => b.id === branchId);
        if (!branch) return;

        set((state) => ({
            questChains: state.questChains.map(c =>
                c.id !== chainId ? c : {
                    ...c,
                    steps: c.steps.map(s => s.id !== stepId ? s : { ...s, completed: true, chosenBranchId: branchId })
                }
            )
        }));
        if (branch.xpBonus > 0) get().addXP(branch.xpBonus);
        get().advanceQuestChain(chainId);
    },
});
