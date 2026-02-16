import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    xpReward: number;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
    completedAt?: string;
    isDaily?: boolean;
}

export interface DailyQuest extends Task {
    expiresAt: string;
    isExpired: boolean;
}

export interface BossBattle {
    id: string;
    name: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
    hp: number;
    maxHp: number;
    xpReward: number;
    goldReward: number;
    itemReward?: InventoryItem;
    startsAt: string;
    expiresAt: string;
    completed: boolean;
    failed: boolean;
}

export interface Reward {
    id: string;
    name: string;
    cost: number;
    purchased: boolean;
}

export interface TimelineEvent {
    id: string;
    name: string;
    date: string;
    subject: string;
    status: 'Ready' | 'Not Ready' | 'Confident' | 'Getting There';
    statusColor: 'blue' | 'red' | 'green' | 'orange';
}

export type CharacterClass = 'Scholar' | 'Strategist' | 'Warrior' | 'Merchant' | 'Creator' | null;

// RPG Elements
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material';

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    quantity: number;
    equipped?: boolean;
    stats?: {
        xpBonus?: number;
        goldBonus?: number;
        streakBonus?: number;
        hpRestore?: number;
        damage?: number;
        defense?: number;
    };
    usable?: boolean;
    consumableEffect?: {
        type: 'xp' | 'gold' | 'heal' | 'buff';
        value: number;
        duration?: number;
    };
}

export interface CraftingRecipe {
    id: string;
    name: string;
    description: string;
    icon: string;
    inputs: { itemId: string; quantity: number }[];
    output: Omit<InventoryItem, 'id'>;
    rarity: ItemRarity;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    icon: string;
    maxLevel: number;
    currentLevel: number;
    unlocked: boolean;
    prerequisites: string[];
    cost: number;
    category: 'productivity' | 'combat' | 'magic' | 'crafting';
    effects: {
        xpMultiplier?: number;
        goldMultiplier?: number;
        taskEfficiency?: number;
    };
}

export interface QuestChain {
    id: string;
    name: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
    steps: QuestStep[];
    currentStep: number;
    completed: boolean;
    reward: {
        xp: number;
        gold: number;
        item?: InventoryItem;
    };
}

export interface QuestStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    taskId?: string;
}

export interface AuctionListing {
    id: string;
    item: InventoryItem;
    price: number;
    sellerId: string;
    listedAt: string;
}

export interface Settings {
    soundEnabled: boolean;
    theme: 'dark' | 'light';
    musicEnabled: boolean;
    sfxVolume: number;
    musicVolume: number;
}

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

export interface GameState {
    xp: number;
    level: number;
    gold: number;
    gems: number;
    tasks: Task[];
    dailyQuests: DailyQuest[];
    shopItems: Reward[];
    purchasedRewards: Reward[];
    bossBattles: BossBattle[];
    craftingRecipes: CraftingRecipe[];

    // Character
    characterClass: CharacterClass;
    characterName: string;
    characterAge: string;
    characterYearLevel: string;
    characterMotto: string;
    characterStrengths: string;
    title: Title;
    
    // Timeline
    timelineEvents: TimelineEvent[];

    // Settings
    settings: Settings;

    // Streak & Login
    lastActiveDate: string | null;
    streak: number;
    totalQuestsCompleted: number;
    lastDailyRewardClaim: string | null;
    loginStreak: number;

    // UI State
    showLevelUp: boolean;
    achievements: string[];

    // RPG Elements
    inventory: InventoryItem[];
    skills: Skill[];
    questChains: QuestChain[];
    equippedItems: {
        weapon?: InventoryItem;
        armor?: InventoryItem;
        accessory?: InventoryItem;
    };

    // Auction House
    auctionListings: AuctionListing[];

    // Buffs/Effects
    activeBuffs: { type: string; value: number; expiresAt: string }[];

    // Character Actions
    setCharacterClass: (characterClass: CharacterClass) => void;
    updateCharacterInfo: (info: Partial<Pick<GameState, 'characterName' | 'characterAge' | 'characterYearLevel' | 'characterMotto' | 'characterStrengths'>>) => void;
    updateTitle: () => void;

    // Timeline Actions
    addTimelineEvent: (name: string, date: string, subject: string, status: TimelineEvent['status'], statusColor: TimelineEvent['statusColor']) => void;
    updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
    deleteTimelineEvent: (id: string) => void;

    // Settings Actions
    updateSettings: (settings: Partial<Settings>) => void;

    // Task Actions
    addXP: (amount: number) => void;
    addTask: (title: string, difficulty?: Task['difficulty'], xp?: number) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    resetProgress: () => void;
    closeLevelUp: () => void;
    unlockAchievement: (id: string) => void;
    checkAchievements: () => void;

    // Economy Actions
    addGold: (amount: number) => void;
    addGems: (amount: number) => void;
    buyReward: (rewardId: string) => void;
    addShopItem: (name: string, cost: number) => void;
    deleteShopItem: (id: string) => void;

    // Streak & Login Actions
    checkStreak: () => void;
    claimDailyReward: () => void;
    checkDailyQuests: () => void;
    generateDailyQuests: () => void;

    // Boss Battle Actions
    startBossBattle: (boss: Omit<BossBattle, 'id' | 'startsAt' | 'completed' | 'failed'>) => void;
    damageBoss: (bossId: string, damage: number) => void;
    failBossBattle: (bossId: string) => void;

    // Crafting Actions
    craftItem: (recipeId: string) => boolean;

    // Auction House Actions
    listItem: (itemId: string, price: number) => void;
    buyFromAuction: (listingId: string) => void;
    cancelListing: (listingId: string) => void;

    // Buff Actions
    addBuff: (type: string, value: number, durationMinutes: number) => void;
    checkBuffs: () => void;

    // Export/Import
    exportSaveData: () => string;
    importSaveData: (data: string) => boolean;

    // RPG Actions - Inventory
    addItem: (item: Omit<InventoryItem, 'id'>) => void;
    removeItem: (id: string, quantity?: number) => void;
    equipItem: (id: string) => void;
    unequipItem: (type: ItemType) => void;
    useItem: (id: string) => void;

    // RPG Actions - Skills
    upgradeSkill: (skillId: string) => void;
    unlockSkill: (skillId: string) => void;
    getSkillMultiplier: (type: 'xp' | 'gold') => number;

    // RPG Actions - Quest Chains
    addQuestChain: (chain: Omit<QuestChain, 'id' | 'currentStep' | 'completed'>) => void;
    advanceQuestChain: (chainId: string) => void;
    completeQuestStep: (chainId: string, stepId: string) => void;
}

const DIFFICULTY_XP = {
    Easy: 10,
    Medium: 25,
    Hard: 50,
    Epic: 100,
};

const DAILY_QUEST_TEMPLATES = [
    { title: 'Complete 3 quests', difficulty: 'Easy' as const, xp: 30 },
    { title: 'Complete a Hard quest', difficulty: 'Hard' as const, xp: 50 },
    { title: 'Complete 5 quests', difficulty: 'Medium' as const, xp: 75 },
    { title: 'Earn 100 gold', difficulty: 'Easy' as const, xp: 25 },
    { title: 'Complete an Epic quest', difficulty: 'Epic' as const, xp: 100 },
    { title: 'Use an item from inventory', difficulty: 'Easy' as const, xp: 20 },
    { title: 'Equip a weapon', difficulty: 'Easy' as const, xp: 15 },
    { title: 'Upgrade a skill', difficulty: 'Medium' as const, xp: 40 },
    { title: 'Complete a quest chain step', difficulty: 'Medium' as const, xp: 35 },
    { title: 'List an item in auction', difficulty: 'Easy' as const, xp: 20 },
];

// BOSS_TEMPLATES moved to bosses/page.tsx

const CRAFTING_RECIPES: CraftingRecipe[] = [
    {
        id: 'health-potion',
        name: 'Health Potion',
        description: 'Restores HP',
        icon: '🧪',
        rarity: 'Common',
        inputs: [{ itemId: 'herbs', quantity: 2 }],
        output: { name: 'Health Potion', description: 'Restores 50 HP', type: 'consumable', rarity: 'Common', icon: '🧪', quantity: 1, stats: { hpRestore: 50 }, usable: true, consumableEffect: { type: 'heal', value: 50 } }
    },
    {
        id: 'xp-scroll',
        name: 'XP Scroll',
        description: 'Grants bonus XP',
        icon: '📜',
        rarity: 'Uncommon',
        inputs: [{ itemId: 'magic-ink', quantity: 2 }, { itemId: 'parchment', quantity: 1 }],
        output: { name: 'XP Scroll', description: 'Grants 50 XP', type: 'consumable', rarity: 'Uncommon', icon: '📜', quantity: 1, stats: { xpBonus: 50 }, usable: true, consumableEffect: { type: 'xp', value: 50 } }
    },
    {
        id: 'gold-pouch',
        name: 'Gold Pouch',
        description: 'Grants bonus gold',
        icon: '💰',
        rarity: 'Uncommon',
        inputs: [{ itemId: 'gold-coin', quantity: 5 }],
        output: { name: 'Gold Pouch', description: 'Grants 100 Gold', type: 'consumable', rarity: 'Uncommon', icon: '💰', quantity: 1, stats: { goldBonus: 100 }, usable: true, consumableEffect: { type: 'gold', value: 100 } }
    },
    {
        id: 'legendary-weapon',
        name: 'Legendary Blade',
        description: 'A blade of great power',
        icon: '⚔️',
        rarity: 'Legendary',
        inputs: [{ itemId: 'dragon-scale', quantity: 3 }, { itemId: 'mithril', quantity: 5 }, { itemId: 'magic-ink', quantity: 3 }],
        output: { name: 'Legendary Blade', description: 'Legendary weapon with +50 XP and +25 Gold bonuses', type: 'weapon', rarity: 'Legendary', icon: '⚔️', quantity: 1, stats: { xpBonus: 50, goldBonus: 25, damage: 100 } }
    },
    {
        id: 'epic-armor',
        name: 'Epic Shield',
        description: 'A powerful defensive item',
        icon: '🛡️',
        rarity: 'Epic',
        inputs: [{ itemId: 'dragon-scale', quantity: 2 }, { itemId: 'iron-ingot', quantity: 3 }],
        output: { name: 'Epic Shield', description: 'Epic armor with +30 XP and +15 Gold bonuses', type: 'armor', rarity: 'Epic', icon: '🛡️', quantity: 1, stats: { xpBonus: 30, goldBonus: 15, defense: 50 } }
    },
    {
        id: 'buff-potion',
        name: 'Buff Potion',
        description: 'Temporary stat boost',
        icon: '🧉',
        rarity: 'Rare',
        inputs: [{ itemId: 'magic-ink', quantity: 1 }, { itemId: 'herbs', quantity: 3 }],
        output: { name: 'Buff Potion', description: '2x XP for 30 minutes', type: 'consumable', rarity: 'Rare', icon: '🧉', quantity: 1, usable: true, consumableEffect: { type: 'buff', value: 2, duration: 30 } }
    },
];

const ACHIEVEMENTS = [
    { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest', condition: (state: GameState) => state.tasks.filter(t => t.completed).length >= 1 },
    { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5', condition: (state: GameState) => state.level >= 5 },
    { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests', condition: (state: GameState) => state.totalQuestsCompleted >= 10 },
    { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat a boss', condition: (state: GameState) => state.bossBattles.some(b => b.completed) },
    { id: 'CRAFTSMAN', name: 'Craftsman', description: 'Craft your first item', condition: (state: GameState) => state.inventory.some(i => i.name.includes('Blade') || i.name.includes('Shield') || i.name.includes('Potion')) },
    { id: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', condition: (state: GameState) => state.streak >= 7 },
    { id: 'TITLE_MASTER', name: 'Titled', description: 'Obtain the Master title', condition: (state: GameState) => state.title === 'Master' },
    { id: 'AUCTIONEER', name: 'Auctioneer', description: 'Buy something from auction', condition: (state: GameState) => state.achievements.includes('AUCTIONEER') },
    { id: 'DAILY_COMPLETE', name: 'Daily Grind', description: 'Complete all daily quests', condition: (state: GameState) => state.dailyQuests.length > 0 && state.dailyQuests.every(q => q.completed) },
    { id: 'LOGIN_30', name: 'Dedicated', description: 'Login 30 days in a row', condition: (state: GameState) => state.loginStreak >= 30 },
];

const DAILY_REWARDS = [
    { day: 1, gold: 50, gems: 5 },
    { day: 2, gold: 75, gems: 5 },
    { day: 3, gold: 100, gems: 10 },
    { day: 4, gold: 125, gems: 10 },
    { day: 5, gold: 150, gems: 15 },
    { day: 6, gold: 175, gems: 20 },
    { day: 7, gold: 250, gems: 50 },
];

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            xp: 0,
            level: 1,
            gold: 0,
            gems: 0,
            tasks: [],
            dailyQuests: [],
            shopItems: [],
            purchasedRewards: [],
            bossBattles: [],
            craftingRecipes: CRAFTING_RECIPES,
            lastActiveDate: null,
            streak: 0,
            totalQuestsCompleted: 0,
            lastDailyRewardClaim: null,
            loginStreak: 0,
            auctionListings: [],
            activeBuffs: [],

            // Character defaults
            characterClass: null,
            characterName: 'Your Name',
            characterAge: '',
            characterYearLevel: '',
            characterMotto: 'Comfort is the enemy',
            characterStrengths: 'Disciplined, Organised, Creative',
            title: 'Novice',

            // Timeline defaults
            timelineEvents: [],

            // Settings defaults
            settings: {
                soundEnabled: true,
                theme: 'dark',
                musicEnabled: true,
                sfxVolume: 0.5,
                musicVolume: 0.3,
            },

            showLevelUp: false,
            achievements: [],

            // RPG Elements - Default Values
            inventory: [],
            equippedItems: {},
            skills: [
                {
                    id: 'productive-mind',
                    name: 'Productive Mind',
                    description: 'Gain 10% more XP from all quests',
                    icon: 'brain',
                    maxLevel: 5,
                    currentLevel: 0,
                    unlocked: true,
                    prerequisites: [],
                    cost: 100,
                    category: 'productivity',
                    effects: { xpMultiplier: 0.1 }
                },
                {
                    id: 'gold-rush',
                    name: 'Gold Rush',
                    description: 'Earn 15% more gold from quests',
                    icon: 'coins',
                    maxLevel: 5,
                    currentLevel: 0,
                    unlocked: true,
                    prerequisites: [],
                    cost: 100,
                    category: 'crafting',
                    effects: { goldMultiplier: 0.15 }
                },
                {
                    id: 'streak-master',
                    name: 'Streak Master',
                    description: 'Streak bonuses are 20% more effective',
                    icon: 'flame',
                    maxLevel: 3,
                    currentLevel: 0,
                    unlocked: false,
                    prerequisites: ['productive-mind'],
                    cost: 250,
                    category: 'productivity',
                    effects: {}
                },
                {
                    id: 'task-efficiency',
                    name: 'Task Efficiency',
                    description: 'Complete tasks 10% faster',
                    icon: 'zap',
                    maxLevel: 3,
                    currentLevel: 0,
                    unlocked: false,
                    prerequisites: ['productive-mind', 'gold-rush'],
                    cost: 300,
                    category: 'productivity',
                    effects: { taskEfficiency: 0.1 }
                },
                {
                    id: 'boss-slayer',
                    name: 'Boss Slayer',
                    description: 'Deal 25% more damage to bosses',
                    icon: 'sword',
                    maxLevel: 5,
                    currentLevel: 0,
                    unlocked: false,
                    prerequisites: ['task-efficiency'],
                    cost: 400,
                    category: 'combat',
                    effects: {}
                },
                {
                    id: 'lucky-star',
                    name: 'Lucky Star',
                    description: '15% chance to get double rewards',
                    icon: 'star',
                    maxLevel: 3,
                    currentLevel: 0,
                    unlocked: false,
                    prerequisites: ['gold-rush'],
                    cost: 350,
                    category: 'magic',
                    effects: {}
                }
            ],
            questChains: [],

            // Character Actions
            setCharacterClass: (characterClass) => set({ characterClass }),
            
            updateCharacterInfo: (info) => set((state) => ({ ...state, ...info })),

            updateTitle: () => {
                const state = get();
                const titles: Title[] = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master', 'Grandmaster', 'Legend'];
                
                for (let i = titles.length - 1; i >= 0; i--) {
                    const t = titles[i];
                    const req = TITLE_REQUIREMENTS[t];
                    if (state.level >= req.level && state.totalQuestsCompleted >= req.quests && state.streak >= req.streaks) {
                        if (state.title !== t) {
                            set({ title: t });
                            get().unlockAchievement('TITLE_MASTER');
                        }
                        return;
                    }
                }
            },

            // Timeline Actions
            addTimelineEvent: (name, date, subject, status, statusColor) => {
                const newEvent: TimelineEvent = {
                    id: crypto.randomUUID(),
                    name,
                    date,
                    subject,
                    status,
                    statusColor,
                };
                set((state) => ({ timelineEvents: [...state.timelineEvents, newEvent] }));
            },

            updateTimelineEvent: (id, updates) => {
                set((state) => ({
                    timelineEvents: state.timelineEvents.map((event) =>
                        event.id === id ? { ...event, ...updates } : event
                    ),
                }));
            },

            deleteTimelineEvent: (id) => {
                set((state) => ({
                    timelineEvents: state.timelineEvents.filter((e) => e.id !== id),
                }));
            },

            // Settings Actions
            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },

            addXP: (amount) => {
                // Apply any active XP buffs
                const state = get();
                let finalAmount = amount;
                state.activeBuffs.forEach(buff => {
                    if (buff.type === 'xp' || buff.type === 'buff') {
                        finalAmount = Math.floor(finalAmount * buff.value);
                    }
                });
                
                // Lucky star chance for double XP
                const luckySkill = state.skills.find(s => s.id === 'lucky-star');
                if (luckySkill && luckySkill.currentLevel > 0 && Math.random() < (luckySkill.currentLevel * 0.05 * luckySkill.currentLevel)) {
                    finalAmount *= 2;
                }

                set((state) => {
                    const newXP = state.xp + finalAmount;
                    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
                    const hasLeveledUp = newLevel > state.level;

                    return {
                        xp: newXP,
                        level: newLevel,
                        showLevelUp: hasLeveledUp || state.showLevelUp
                    };
                });
                get().checkAchievements();
                get().updateTitle();
            },

            closeLevelUp: () => set({ showLevelUp: false }),

            addGold: (amount) => {
                const state = get();
                let finalAmount = amount;
                
                state.activeBuffs.forEach(buff => {
                    if (buff.type === 'gold' || buff.type === 'buff') {
                        finalAmount = Math.floor(finalAmount * buff.value);
                    }
                });
                
                // Lucky star chance for double gold
                const luckySkill = state.skills.find(s => s.id === 'lucky-star');
                if (luckySkill && luckySkill.currentLevel > 0 && Math.random() < (luckySkill.currentLevel * 0.05 * luckySkill.currentLevel)) {
                    finalAmount *= 2;
                }
                
                set((state) => ({ gold: state.gold + finalAmount }));
            },

            addGems: (amount) => set((state) => ({ gems: state.gems + amount })),

            addShopItem: (name, cost) => {
                const newItem: Reward = { id: crypto.randomUUID(), name, cost, purchased: false };
                set((state) => ({ shopItems: [...state.shopItems, newItem] }));
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
                }
            },

            checkStreak: () => {
                const state = get();
                const today = new Date().toISOString().split('T')[0];
                const lastActive = state.lastActiveDate;

                if (lastActive !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActive === yesterdayStr) {
                        set({ streak: state.streak + 1, lastActiveDate: today });
                    } else if (!lastActive) {
                        set({ streak: 1, lastActiveDate: today });
                    } else {
                        set({ streak: 1, lastActiveDate: today });
                    }
                }
            },

            claimDailyReward: () => {
                const state = get();
                const today = new Date().toISOString().split('T')[0];
                
                if (state.lastDailyRewardClaim === today) return;
                
                const nextDay = (state.loginStreak % 7) + 1;
                const reward = DAILY_REWARDS[nextDay - 1];
                
                set((state) => ({
                    gold: state.gold + reward.gold,
                    gems: state.gems + reward.gems,
                    lastDailyRewardClaim: today,
                    loginStreak: state.loginStreak + 1
                }));
                
                get().unlockAchievement('LOGIN_30');
            },

            generateDailyQuests: () => {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const selected = [...DAILY_QUEST_TEMPLATES]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                
                const dailyQuests: DailyQuest[] = selected.map((template, index) => ({
                    id: `daily-${today.toDateString()}-${index}`,
                    title: template.title,
                    completed: false,
                    xpReward: template.xp,
                    difficulty: template.difficulty,
                    expiresAt: tomorrow.toISOString(),
                    isExpired: false,
                    isDaily: true
                }));
                
                set({ dailyQuests });
            },

            checkDailyQuests: () => {
                const state = get();
                const now = new Date();
                
                const updated = state.dailyQuests.map(q => ({
                    ...q,
                    isExpired: new Date(q.expiresAt) < now
                }));
                
                const hasExpired = updated.some(q => q.isExpired && !q.completed);
                
                if (hasExpired || updated.length === 0) {
                    get().generateDailyQuests();
                } else {
                    set({ dailyQuests: updated });
                }
            },

            // Boss Battle Actions
            startBossBattle: (boss) => {
                const newBoss: BossBattle = {
                    ...boss,
                    id: crypto.randomUUID(),
                    startsAt: new Date().toISOString(),
                    completed: false,
                    failed: false
                };
                set((state) => ({ bossBattles: [...state.bossBattles, newBoss] }));
            },

            damageBoss: (bossId, damage) => {
                const state = get();
                const boss = state.bossBattles.find(b => b.id === bossId);
                if (!boss || boss.completed || boss.failed) return;
                
                // Apply boss slayer bonus
                const bossSlayerSkill = state.skills.find(s => s.id === 'boss-slayer');
                if (bossSlayerSkill && bossSlayerSkill.currentLevel > 0) {
                    damage = Math.floor(damage * (1 + bossSlayerSkill.currentLevel * 0.05 * bossSlayerSkill.currentLevel));
                }
                
                const newHp = boss.hp - damage;
                
                if (newHp <= 0) {
                    set((state) => ({
                        bossBattles: state.bossBattles.map(b =>
                            b.id === bossId ? { ...b, hp: 0, completed: true } : b
                        )
                    }));
                    state.addXP(boss.xpReward);
                    state.addGold(boss.goldReward);
                    if (boss.itemReward) {
                        state.addItem(boss.itemReward);
                    }
                    state.unlockAchievement('BOSS_SLAYER');
                } else {
                    set((state) => ({
                        bossBattles: state.bossBattles.map(b =>
                            b.id === bossId ? { ...b, hp: newHp } : b
                        )
                    }));
                }
            },

            failBossBattle: (bossId) => {
                set((state) => ({
                    bossBattles: state.bossBattles.map(b =>
                        b.id === bossId ? { ...b, failed: true } : b
                    )
                }));
            },

            // Crafting Actions
            craftItem: (recipeId) => {
                const state = get();
                const recipe = state.craftingRecipes.find(r => r.id === recipeId);
                if (!recipe) return false;
                
                // Check if player has required items
                for (const input of recipe.inputs) {
                    const hasItem = state.inventory.find(i => 
                        i.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || 
                        i.id === input.itemId
                    );
                    if (!hasItem || hasItem.quantity < input.quantity) {
                        return false;
                    }
                }
                
                // Remove input items
                for (const input of recipe.inputs) {
                    const item = state.inventory.find(i => 
                        i.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || 
                        i.id === input.itemId
                    );
                    if (item) {
                        get().removeItem(item.id, input.quantity);
                    }
                }
                
                // Add output item
                get().addItem(recipe.output);
                get().unlockAchievement('CRAFTSMAN');
                return true;
            },

            // Auction House Actions
            listItem: (itemId, price) => {
                const state = get();
                const item = state.inventory.find(i => i.id === itemId);
                if (!item) return;
                
                const listing: AuctionListing = {
                    id: crypto.randomUUID(),
                    item: { ...item },
                    price,
                    sellerId: 'player',
                    listedAt: new Date().toISOString()
                };
                
                get().removeItem(itemId, item.quantity);
                set((state) => ({ auctionListings: [...state.auctionListings, listing] }));
            },

            buyFromAuction: (listingId) => {
                const state = get();
                const listing = state.auctionListings.find(l => l.id === listingId);
                if (!listing || state.gold < listing.price) return;
                
                set((state) => ({
                    gold: state.gold - listing.price,
                    inventory: [...state.inventory, { ...listing.item, id: crypto.randomUUID() }],
                    auctionListings: state.auctionListings.filter(l => l.id !== listingId)
                }));
                
                if (listing.sellerId !== 'player') {
                    state.unlockAchievement('AUCTIONEER');
                }
            },

            cancelListing: (listingId) => {
                const state = get();
                const listing = state.auctionListings.find(l => l.id === listingId);
                if (!listing || listing.sellerId !== 'player') return;
                
                set((state) => ({
                    auctionListings: state.auctionListings.filter(l => l.id !== listingId),
                    inventory: [...state.inventory, { ...listing.item, id: crypto.randomUUID() }]
                }));
            },

            // Buff Actions
            addBuff: (type, value, durationMinutes) => {
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
                
                set((state) => ({
                    activeBuffs: [...state.activeBuffs, { type, value, expiresAt: expiresAt.toISOString() }]
                }));
            },

            checkBuffs: () => {
                const now = new Date();
                set((state) => ({
                    activeBuffs: state.activeBuffs.filter(buff => new Date(buff.expiresAt) > now)
                }));
            },

            // Export/Import
            exportSaveData: () => {
                const state = get();
                return JSON.stringify({
                    xp: state.xp,
                    level: state.level,
                    gold: state.gold,
                    gems: state.gems,
                    tasks: state.tasks,
                    dailyQuests: state.dailyQuests,
                    inventory: state.inventory,
                    skills: state.skills,
                    questChains: state.questChains,
                    streak: state.streak,
                    totalQuestsCompleted: state.totalQuestsCompleted,
                    loginStreak: state.loginStreak,
                    achievements: state.achievements,
                    title: state.title,
                    settings: state.settings,
                    characterClass: state.characterClass,
                    characterName: state.characterName,
                    characterMotto: state.characterMotto,
                    characterStrengths: state.characterStrengths,
                    timelineEvents: state.timelineEvents,
                });
            },

            importSaveData: (data) => {
                try {
                    const parsed = JSON.parse(data);
                    set({
                        xp: parsed.xp || 0,
                        level: parsed.level || 1,
                        gold: parsed.gold || 0,
                        gems: parsed.gems || 0,
                        tasks: parsed.tasks || [],
                        dailyQuests: parsed.dailyQuests || [],
                        inventory: parsed.inventory || [],
                        skills: parsed.skills || [],
                        questChains: parsed.questChains || [],
                        streak: parsed.streak || 0,
                        totalQuestsCompleted: parsed.totalQuestsCompleted || 0,
                        loginStreak: parsed.loginStreak || 0,
                        achievements: parsed.achievements || [],
                        title: parsed.title || 'Novice',
                        settings: parsed.settings || { soundEnabled: true, theme: 'dark', musicEnabled: true, sfxVolume: 0.5, musicVolume: 0.3 },
                        characterClass: parsed.characterClass || null,
                        characterName: parsed.characterName || 'Your Name',
                        characterMotto: parsed.characterMotto || 'Comfort is the enemy',
                        characterStrengths: parsed.characterStrengths || 'Disciplined, Organised, Creative',
                        timelineEvents: parsed.timelineEvents || [],
                    });
                    return true;
                } catch {
                    return false;
                }
            },

            unlockAchievement: (id) => {
                set((state) => {
                    if (state.achievements.includes(id)) return state;
                    return { achievements: [...state.achievements, id] };
                });
            },

            checkAchievements: () => {
                const state = get();
                ACHIEVEMENTS.forEach((achievement) => {
                    if (!state.achievements.includes(achievement.id) && achievement.condition(state)) {
                        state.unlockAchievement(achievement.id);
                    }
                });
            },

            addTask: (title, difficulty = 'Medium', customXP, isDaily = false) => {
                const xpReward = customXP || DIFFICULTY_XP[difficulty];
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    title,
                    completed: false,
                    xpReward,
                    difficulty,
                    isDaily
                };
                set((state) => ({ tasks: [...state.tasks, newTask] }));
            },

            toggleTask: (id) => {
                const state = get();
                const task = state.tasks.find((t) => t.id === id);

                if (task) {
                    if (!task.completed) {
                        state.addXP(task.xpReward);
                        const goldReward = Math.floor(task.xpReward / 2);
                        state.addGold(goldReward);
                        state.checkStreak();
                        set((s) => ({ totalQuestsCompleted: s.totalQuestsCompleted + 1 }));
                        
                        // Random item drop check
                        if (Math.random() < 0.15) {
                            const dropItems = [
                                { name: 'Health Potion', description: 'Restores health', type: 'consumable' as const, rarity: 'Common' as const, icon: '🧪' },
                                { name: 'Gold Coin', description: 'A shiny gold coin', type: 'material' as const, rarity: 'Common' as const, icon: '🪙' },
                                { name: 'XP Scroll', description: 'Grants bonus XP', type: 'consumable' as const, rarity: 'Uncommon' as const, icon: '📜' },
                                { name: 'Mystery Gem', description: 'A mysterious gem', type: 'material' as const, rarity: 'Rare' as const, icon: '💎' },
                            ];
                            const randomItem = dropItems[Math.floor(Math.random() * dropItems.length)];
                            const newItem: InventoryItem = {
                                ...randomItem,
                                id: crypto.randomUUID(),
                                quantity: 1,
                                stats: randomItem.rarity === 'Uncommon' ? { xpBonus: 10 } : randomItem.rarity === 'Rare' ? { xpBonus: 25, goldBonus: 10 } : undefined
                            };
                            set((s) => ({ inventory: [...s.inventory, newItem] }));
                        }
                    } else {
                        state.addXP(-task.xpReward);
                        state.addGold(-Math.floor(task.xpReward / 2));
                    }

                    const now = new Date().toISOString();

                    set((state) => ({
                        tasks: state.tasks.map((t) =>
                            t.id === id ? {
                                ...t,
                                completed: !t.completed,
                                completedAt: !t.completed ? now : undefined
                            } : t
                        ),
                        dailyQuests: state.dailyQuests.map((q) =>
                            q.id === id ? { ...q, completed: !q.completed } : q
                        )
                    }));

                    get().checkAchievements();
                }
            },

            deleteTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== id),
                }));
            },

            // RPG Actions - Inventory
            addItem: (item) => {
                const newItem: InventoryItem = { ...item, id: crypto.randomUUID() };
                set((state) => ({
                    inventory: [...state.inventory, newItem]
                }));
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
                                    ? undefined 
                                    : state.equippedItems[item.type as keyof typeof state.equippedItems]
                            }
                        };
                    }
                    
                    return {
                        inventory: state.inventory.map(i =>
                            i.id === id ? { ...i, quantity: i.quantity - quantity } : i
                        )
                    };
                });
            },

            equipItem: (id) => {
                set((state) => {
                    const item = state.inventory.find(i => i.id === id);
                    if (!item) return state;
                    
                    return {
                        inventory: state.inventory.map(i =>
                            i.id === id ? { ...i, equipped: true } :
                            i.type === item.type ? { ...i, equipped: false } : i
                        ),
                        equippedItems: {
                            ...state.equippedItems,
                            [item.type]: item
                        }
                    };
                });
            },

            unequipItem: (type) => {
                set((state) => ({
                    inventory: state.inventory.map(i =>
                        i.type === type ? { ...i, equipped: false } : i
                    ),
                    equippedItems: {
                        ...state.equippedItems,
                        [type]: undefined
                    }
                }));
            },

            useItem: (id) => {
                const state = get();
                const item = state.inventory.find(i => i.id === id);
                if (!item || !item.usable) return;
                
                if (item.consumableEffect) {
                    const { type, value, duration } = item.consumableEffect;
                    
                    if (type === 'xp') {
                        state.addXP(value);
                    } else if (type === 'gold') {
                        state.addGold(value);
                    } else if (type === 'heal') {
                        // HP restore - could integrate with health system
                    } else if (type === 'buff' && duration) {
                        state.addBuff('buff', value, duration);
                    }
                }
                
                if (item.stats?.xpBonus) {
                    state.addXP(item.stats.xpBonus);
                }
                if (item.stats?.goldBonus) {
                    state.addGold(item.stats.goldBonus);
                }
                
                state.removeItem(id, 1);
                get().unlockAchievement('CRAFTSMAN');
            },

            // RPG Actions - Skills
            upgradeSkill: (skillId) => {
                set((state) => {
                    const skill = state.skills.find(s => s.id === skillId);
                    if (!skill || !skill.unlocked || skill.currentLevel >= skill.maxLevel) return state;
                    
                    const cost = skill.cost * (skill.currentLevel + 1);
                    if (state.xp < cost) return state;
                    
                    return {
                        xp: state.xp - cost,
                        skills: state.skills.map(s =>
                            s.id === skillId ? { ...s, currentLevel: s.currentLevel + 1 } : s
                        )
                    };
                });
            },

            unlockSkill: (skillId) => {
                set((state) => {
                    const skill = state.skills.find(s => s.id === skillId);
                    if (!skill || skill.unlocked) return state;
                    
                    const prereqsMet = skill.prerequisites.every(prereqId =>
                        state.skills.find(s => s.id === prereqId)?.unlocked
                    );
                    
                    if (!prereqsMet) return state;
                    
                    return {
                        skills: state.skills.map(s =>
                            s.id === skillId ? { ...s, unlocked: true } : s
                        )
                    };
                });
            },

            getSkillMultiplier: (type) => {
                const state = get();
                let multiplier = 1;
                
                state.skills.forEach(skill => {
                    if (skill.currentLevel > 0) {
                        if (type === 'xp' && skill.effects.xpMultiplier) {
                            multiplier += skill.effects.xpMultiplier * skill.currentLevel;
                        }
                        if (type === 'gold' && skill.effects.goldMultiplier) {
                            multiplier += skill.effects.goldMultiplier * skill.currentLevel;
                        }
                    }
                });
                
                // Apply active buffs
                state.activeBuffs.forEach(buff => {
                    if (buff.type === type || buff.type === 'buff') {
                        multiplier *= buff.value;
                    }
                });
                
                return multiplier;
            },

            // RPG Actions - Quest Chains
            addQuestChain: (chain) => {
                const newChain: QuestChain = {
                    ...chain,
                    id: crypto.randomUUID(),
                    currentStep: 0,
                    completed: false,
                    steps: chain.steps.map(step => ({
                        ...step,
                        id: crypto.randomUUID(),
                        completed: false
                    }))
                };
                set((state) => ({
                    questChains: [...state.questChains, newChain]
                }));
            },

            advanceQuestChain: (chainId) => {
                set((state) => {
                    const chain = state.questChains.find(c => c.id === chainId);
                    if (!chain || chain.completed) return state;
                    
                    const nextStep = chain.currentStep + 1;
                    const isComplete = nextStep >= chain.steps.length;
                    
                    if (isComplete) {
                        const newState = {
                            questChains: state.questChains.map(c =>
                                c.id === chainId ? { ...c, completed: true, currentStep: nextStep } : c
                            )
                        };
                        
                        get().addXP(chain.reward.xp);
                        get().addGold(chain.reward.gold);
                        if (chain.reward.item) {
                            get().addItem(chain.reward.item);
                        }
                        
                        return newState;
                    }
                    
                    return {
                        questChains: state.questChains.map(c =>
                            c.id === chainId ? { ...c, currentStep: nextStep } : c
                        )
                    };
                });
            },

            completeQuestStep: (chainId, stepId) => {
                set((state) => ({
                    questChains: state.questChains.map(chain => {
                        if (chain.id !== chainId) return chain;
                        
                        const updatedSteps = chain.steps.map(step =>
                            step.id === stepId ? { ...step, completed: true } : step
                        );
                        
                        const allComplete = updatedSteps.every(s => s.completed);
                        
                        return {
                            ...chain,
                            steps: updatedSteps,
                            completed: allComplete
                        };
                    })
                }));
                
                get().advanceQuestChain(chainId);
            },

            resetProgress: () => {
                set({ 
                    xp: 0, 
                    level: 1, 
                    tasks: [], 
                    dailyQuests: [],
                    inventory: [], 
                    equippedItems: {}, 
                    questChains: [],
                    bossBattles: [],
                    streak: 0,
                    totalQuestsCompleted: 0,
                    loginStreak: 0,
                    achievements: [],
                    title: 'Novice',
                    auctionListings: [],
                    activeBuffs: [],
                    gems: 0
                });
            },
        }),
        {
            name: 'ai-productivity-storage',
        }
    )
);
