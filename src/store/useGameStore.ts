import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Module-level map: one active reset-timer per recurring task.
// Using a Map outside the store avoids serialisation and keeps timer handles
// away from persisted state.  The timer reference lets us cancel a previous
// timer before creating a new one, preventing multiple accumulated timeouts
// from resetting a task more than once per cycle.
const recurringTaskTimers = new Map<string, ReturnType<typeof setTimeout>>();
import { createIndexedDBStorage, setHasHydrated } from '@/lib/zustandStorage';
import {
    validateTaskTitle,
    validateCharacterName,
    validateMotto,
    validateStrengths,
    validateShopItemName,
    validateGoalTitle,
    validateGoalDescription,
    validateHabitName,
    validateTimelineEventName,
    validateTimelineSubject,
    validateCost,
    validateAmount,
    ValidationError,
} from '@/lib/validation';

export type TaskCategory = 'Study' | 'Health' | 'Creative' | 'Work' | 'Social' | 'Personal' | 'Other';

export type TaskDuration = 'quick' | '1-hour' | 'half-day' | 'full-day' | 'multi-day' | 'week' | 'month';

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    xpReward: number;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
    category: TaskCategory;
    completedAt?: string;
    isDaily?: boolean;
    recurring?: 'none' | 'daily' | 'weekly';
    duration?: TaskDuration;
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

export interface StepBranch {
    id: string;
    label: string;       // e.g. "Study the theory"
    description: string; // shown as a choice subtitle
    xpBonus: number;     // extra XP awarded for this branch
}

export interface QuestStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    taskId?: string;
    branches?: StepBranch[];  // if set, user must pick a branch to complete
    chosenBranchId?: string;  // which branch was chosen
}

export interface Habit {
    id: string;
    name: string;
    icon: string;
    category: TaskCategory;
    xpReward: number;
    streak: number;
    longestStreak: number;
    completedDates: string[]; // ISO date strings: 'YYYY-MM-DD'
    createdAt: string;
    lastCompletedDate: string | null;
}

export type GoalTimeframe = 'week' | 'month' | 'quarter' | 'year' | 'lifetime';

export interface GoalMilestone {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    category: TaskCategory;
    timeframe: GoalTimeframe;
    targetDate: string; // ISO date string
    milestones: GoalMilestone[];
    completed: boolean;
    completedAt?: string;
    createdAt: string;
    xpReward: number;
    manualProgress?: number; // 0-100, used when goal has no milestones
}

export type ActivityType = 'quest_complete' | 'habit_complete' | 'item_drop' | 'level_up' | 'achievement' | 'reflection' | 'xp_earned' | 'boss_damage' | 'goal_milestone' | 'purchase';

export interface ActivityEntry {
    id: string;
    type: ActivityType;
    icon: string;
    text: string;
    detail?: string;
    timestamp: string; // ISO string
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
    hp: number;
    maxHp: number;

    // Timeline
    timelineEvents: TimelineEvent[];

    // Settings
    settings: Settings;

    // Streak & Login
    lastActiveDate: string | null;
    streak: number;
    streakFreezes: number;       // purchased streak protection charges
    lastFreezedDate: string | null; // date when a freeze was last used
    totalQuestsCompleted: number;
    lastDailyRewardClaim: string | null;
    loginStreak: number;
    isMusicDucked: boolean;

    // Focus Timer Stats
    focusSessionsTotal: number;
    focusMinutesTotal: number;
    isFocusTimerRunning: boolean;
    activeFocusTaskId: string | null;
    setMusicDucked: (ducked: boolean) => void;

    // UI State
    showLevelUp: boolean;
    achievements: string[];
    dynamicAchievements: { name: string; description: string; icon: string; earnedAt: string }[];
    lastDroppedItem: string | null; // Name of last item dropped, for toast display
    lastCriticalHit: number | null; // XP amount when lucky-star double fires, for toast display
    comebackBonusAmount: number | null; // XP awarded when returning after a broken streak

    // Daily intention & reflection
    lastIntentionDate: string | null;
    lastReflectionDate: string | null;
    todayIntention: string;
    todayEnergyRating: number; // 1-5
    reflectionNotes: { date: string; note: string; stars: number }[];

    // RPG Elements
    inventory: InventoryItem[];
    skills: Skill[];
    questChains: QuestChain[];
    equippedItems: {
        weapon?: InventoryItem;
        armor?: InventoryItem;
        accessory?: InventoryItem;
    };

    // Habits
    habits: Habit[];

    // Goals
    goals: Goal[];

    // Buffs/Effects
    activeBuffs: { type: string; value: number; expiresAt: string }[];

    // Activity Feed
    activityLog: ActivityEntry[];
    logActivity: (type: ActivityType, icon: string, text: string, detail?: string) => void;

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
    addTask: (title: string, difficulty?: Task['difficulty'], xp?: number, category?: TaskCategory, recurring?: Task['recurring'], duration?: TaskDuration) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    resetProgress: () => void;
    closeLevelUp: () => void;
    clearDroppedItem: () => void;
    clearCriticalHit: () => void;
    clearComebackBonus: () => void;
    unlockAchievement: (id: string) => void;
    checkAchievements: () => void;
    addDynamicAchievement: (achievement: { name: string; description: string; icon: string }) => void;

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
    toggleDailyQuest: (questId: string) => void;

    // Boss Battle Actions
    startBossBattle: (boss: Omit<BossBattle, 'id' | 'startsAt' | 'completed' | 'failed'>) => void;
    damageBoss: (bossId: string, damage: number) => void;
    failBossBattle: (bossId: string) => void;

    // Crafting Actions
    craftItem: (recipeId: string) => boolean;

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
    resetSkill: (skillId: string) => void;
    getSkillMultiplier: (type: 'xp' | 'gold') => number;

    // Gold sink actions
    buyGoldBuff: (type: 'xp' | 'gold', durationMinutes: number, goldCost: number) => boolean;

    // Habit Actions
    addHabit: (name: string, icon: string, category: TaskCategory, xpReward: number) => void;
    completeHabit: (habitId: string) => void;
    deleteHabit: (habitId: string) => void;
    checkHabitResets: () => void;

    // Goal Actions
    addGoal: (title: string, description: string, category: TaskCategory, timeframe: GoalTimeframe, targetDate: string, milestones: string[], xpReward: number) => void;
    completeGoalMilestone: (goalId: string, milestoneId: string) => void;
    completeGoal: (goalId: string) => void;
    deleteGoal: (goalId: string) => void;

    // Intention & Reflection Actions
    setDailyIntention: (intention: string, energyRating: number) => void;
    addReflectionNote: (note: string, stars: number, xpBonus: number) => void;

    // Focus Timer Actions
    addFocusSession: (minutesCompleted: number) => void;
    setFocusTimerRunning: (running: boolean, taskId: string | null) => void;

    // Character Health Actions
    setHP: (hp: number) => void;
    takeDamage: (amount: number) => void;

    // RPG Actions - Quest Chains
    addQuestChain: (chain: Omit<QuestChain, 'id' | 'currentStep' | 'completed'>) => void;
    advanceQuestChain: (chainId: string) => void;
    completeQuestStep: (chainId: string, stepId: string) => void;
    chooseBranch: (chainId: string, stepId: string, branchId: string) => void;

    // Goal Progress
    updateGoalProgress: (goalId: string, progress: number) => void;

    // Streak Freeze
    buyStreakFreeze: () => void;
}

const DIFFICULTY_XP = {
    Easy: 10,
    Medium: 25,
    Hard: 50,
    Epic: 100,
};

// XP needed to reach a given level (cumulative)
// Level 1=0, 2=100, 3=250, 4=475, 5=800 ... scales with level^1.8
export function xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(50 * Math.pow(level - 1, 1.8));
}

// Derive level from total XP using the curve
export function levelFromXP(xp: number): number {
    let level = 1;
    while (xpForLevel(level + 1) <= xp) {
        level++;
        if (level >= 100) break; // cap at 100
    }
    return level;
}

// Class passive bonuses applied on top of base rewards
export const CLASS_BONUSES: Record<NonNullable<CharacterClass>, { xpMultiplier: number; goldMultiplier: number; bossMultiplier: number; dropBonus: number; description: string }> = {
    Scholar: { xpMultiplier: 1.20, goldMultiplier: 1.00, bossMultiplier: 1.00, dropBonus: 0.00, description: '+20% XP from all quests' },
    Strategist: { xpMultiplier: 1.10, goldMultiplier: 1.10, bossMultiplier: 1.15, dropBonus: 0.00, description: '+10% XP & Gold, +15% boss damage' },
    Warrior: { xpMultiplier: 1.00, goldMultiplier: 1.00, bossMultiplier: 1.30, dropBonus: 0.05, description: '+30% boss damage, +5% item drop chance' },
    Merchant: { xpMultiplier: 1.00, goldMultiplier: 1.25, bossMultiplier: 1.00, dropBonus: 0.05, description: '+25% Gold from all quests, +5% item drop chance' },
    Creator: { xpMultiplier: 1.15, goldMultiplier: 1.15, bossMultiplier: 1.00, dropBonus: 0.10, description: '+15% XP & Gold, +10% item drop chance' },
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
    // Original 10
    { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest', icon: '⚔️', condition: (state: GameState) => state.totalQuestsCompleted >= 1 },
    { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5', icon: '⭐', condition: (state: GameState) => state.level >= 5 },
    { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests', icon: '📜', condition: (state: GameState) => state.totalQuestsCompleted >= 10 },
    { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat a boss battle', icon: '🐉', condition: (state: GameState) => state.bossBattles.some(b => b.completed) },
    { id: 'CRAFTSMAN', name: 'Craftsman', description: 'Craft your first item', icon: '🔨', condition: (state: GameState) => state.inventory.some(i => i.name.includes('Blade') || i.name.includes('Shield') || i.name.includes('Potion')) },
    { id: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', condition: (state: GameState) => state.streak >= 7 },
    { id: 'TITLE_MASTER', name: 'Titled', description: 'Obtain the Master title', icon: '🎖️', condition: (state: GameState) => state.title === 'Master' },
    { id: 'DAILY_COMPLETE', name: 'Daily Grind', description: 'Complete all daily quests in a day', icon: '✅', condition: (state: GameState) => state.dailyQuests.length > 0 && state.dailyQuests.every(q => q.completed) },
    { id: 'LOGIN_30', name: 'Dedicated', description: 'Login 30 days in a row', icon: '📅', condition: (state: GameState) => state.loginStreak >= 30 },
    // New 10
    { id: 'QUEST_CENTURION', name: 'Centurion', description: 'Complete 100 quests', icon: '💯', condition: (state: GameState) => state.totalQuestsCompleted >= 100 },
    { id: 'STREAK_30', name: 'Streak Legend', description: 'Maintain a 30-day streak', icon: '👑', condition: (state: GameState) => state.streak >= 30 },
    { id: 'HABIT_HERO', name: 'Habit Hero', description: 'Complete a habit 7 days in a row', icon: '🏆', condition: (state: GameState) => state.habits.some(h => h.streak >= 7) },
    { id: 'GOAL_GETTER', name: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', condition: (state: GameState) => state.goals.some(g => g.completed) },
    { id: 'HABIT_BUILDER', name: 'Habit Builder', description: 'Create 5 habits', icon: '🌱', condition: (state: GameState) => state.habits.length >= 5 },
    { id: 'EPIC_SLAYER', name: 'Epic Slayer', description: 'Complete 10 Epic difficulty quests', icon: '⚡', condition: (state: GameState) => state.tasks.filter(t => t.completed && t.difficulty === 'Epic').length >= 10 },
    { id: 'LEVEL_20', name: 'Veteran', description: 'Reach Level 20', icon: '💎', condition: (state: GameState) => state.level >= 20 },
    { id: 'SCHOLAR_ELITE', name: 'Scholar Elite', description: 'Complete 25 Study quests', icon: '📚', condition: (state: GameState) => state.tasks.filter(t => t.completed && t.category === 'Study').length >= 25 },
    { id: 'HEALTH_WARRIOR', name: 'Health Warrior', description: 'Complete 25 Health quests', icon: '💪', condition: (state: GameState) => state.tasks.filter(t => t.completed && t.category === 'Health').length >= 25 },
    { id: 'REFLECTOR', name: 'Self Reflector', description: 'Submit 7 evening reflections', icon: '🌙', condition: (state: GameState) => state.reflectionNotes.length >= 7 },
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
            streakFreezes: 0,
            lastFreezedDate: null,
            focusSessionsTotal: 0,
            focusMinutesTotal: 0,
            isFocusTimerRunning: false,
            activeFocusTaskId: null,
            habits: [],
            goals: [],
            activeBuffs: [],
            activityLog: [],
            isMusicDucked: false,

            // Character defaults
            characterClass: null,
            characterName: 'Your Name',
            characterAge: '',
            characterYearLevel: '',
            characterMotto: 'Comfort is the enemy',
            characterStrengths: 'Disciplined, Organised, Creative',
            title: 'Novice',
            hp: 100,
            maxHp: 100,

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
            dynamicAchievements: [],
            lastDroppedItem: null,
            lastCriticalHit: null,
            comebackBonusAmount: null,

            // Daily intention & reflection
            lastIntentionDate: null,
            lastReflectionDate: null,
            todayIntention: '',
            todayEnergyRating: 3,
            reflectionNotes: [] as { date: string; note: string; stars: number }[],

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

            updateCharacterInfo: (info) => {
                try {
                    const validatedInfo: Partial<Pick<GameState, 'characterName' | 'characterAge' | 'characterYearLevel' | 'characterMotto' | 'characterStrengths'>> = {};

                    if (info.characterName !== undefined) {
                        validatedInfo.characterName = validateCharacterName(info.characterName);
                    }
                    if (info.characterAge !== undefined) {
                        validatedInfo.characterAge = info.characterAge.slice(0, 10); // Limit age input
                    }
                    if (info.characterYearLevel !== undefined) {
                        validatedInfo.characterYearLevel = info.characterYearLevel.slice(0, 20);
                    }
                    if (info.characterMotto !== undefined) {
                        validatedInfo.characterMotto = validateMotto(info.characterMotto);
                    }
                    if (info.characterStrengths !== undefined) {
                        validatedInfo.characterStrengths = validateStrengths(info.characterStrengths);
                    }

                    set((state) => ({ ...state, ...validatedInfo }));
                } catch (error) {
                    if (error instanceof ValidationError) {
                        console.error('Validation error:', error.message);
                    }
                    throw error;
                }
            },

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
                try {
                    const validatedName = validateTimelineEventName(name);
                    const validatedSubject = validateTimelineSubject(subject);
                    const newEvent: TimelineEvent = {
                        id: crypto.randomUUID(),
                        name: validatedName,
                        date,
                        subject: validatedSubject,
                        status,
                        statusColor,
                    };
                    set((state) => ({ timelineEvents: [...state.timelineEvents, newEvent] }));
                } catch (error) {
                    if (error instanceof ValidationError) {
                        console.error('Validation error:', error.message);
                    }
                    throw error;
                }
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

            // Activity Log
            logActivity: (type, icon, text, detail) => {
                const entry: ActivityEntry = {
                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    type,
                    icon,
                    text,
                    detail,
                    timestamp: new Date().toISOString(),
                };
                set((state) => ({
                    activityLog: [entry, ...state.activityLog].slice(0, 20),
                }));
            },

            // Settings Actions
            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },

            addXP: (amount) => {
                try {
                    const validatedAmount = validateAmount(amount);
                    // Apply any active XP buffs
                    const state = get();
                    let finalAmount = validatedAmount;
                    let isCritical = false;

                    // Apply class XP bonus and buffs only when gaining XP (not penalising uncomplete)
                    if (finalAmount > 0) {
                        if (state.characterClass) {
                            finalAmount = Math.floor(finalAmount * CLASS_BONUSES[state.characterClass].xpMultiplier);
                        }

                        state.activeBuffs.forEach(buff => {
                            if (buff.type === 'xp' || buff.type === 'buff') {
                                finalAmount = Math.floor(finalAmount * buff.value);
                            }
                        });

                        // Lucky star chance for double XP (rewards only, not penalties)
                        const luckySkill = state.skills.find(s => s.id === 'lucky-star');
                        if (luckySkill && luckySkill.currentLevel > 0 && Math.random() < (luckySkill.currentLevel * 0.05)) {
                            finalAmount *= 2;
                            isCritical = true;
                        }
                    }

                    const prevLevel = get().level;
                    set((state) => {
                        const newXP = Math.max(0, state.xp + finalAmount);
                        const newLevel = levelFromXP(newXP);
                        const hasLeveledUp = newLevel > state.level;

                        return {
                            xp: newXP,
                            level: newLevel,
                            showLevelUp: hasLeveledUp || state.showLevelUp,
                            lastCriticalHit: isCritical ? finalAmount : state.lastCriticalHit,
                        };
                    });
                    const newLevel = get().level;
                    if (newLevel > prevLevel) {
                        get().logActivity('level_up', '🎉', `Reached Level ${newLevel}!`, `Leveled up from ${prevLevel}`);
                    }
                    get().checkAchievements();
                    get().updateTitle();
                } catch (error) {
                    // ValidationErrors from addXP are non-fatal (e.g. amount too large).
                    // Log and return rather than re-throwing so callers (toggleTask,
                    // completeHabit, etc.) that have no surrounding try/catch don't crash.
                    console.error('addXP error:', error instanceof ValidationError ? error.message : error);
                }
            },

            closeLevelUp: () => set({ showLevelUp: false }),
            clearDroppedItem: () => set({ lastDroppedItem: null }),
            clearCriticalHit: () => set({ lastCriticalHit: null }),
            clearComebackBonus: () => set({ comebackBonusAmount: null }),

            addGold: (amount) => {
                try {
                    const validatedAmount = validateAmount(amount);
                    const state = get();
                    let finalAmount = validatedAmount;

                    // Apply class gold bonus (only when gaining gold, not spending)
                    if (validatedAmount > 0 && state.characterClass) {
                        finalAmount = Math.floor(finalAmount * CLASS_BONUSES[state.characterClass].goldMultiplier);
                    }

                    // Buffs and lucky star bonuses only apply when gaining gold,
                    // not when deducting a penalty (e.g. uncompleting a task).
                    if (finalAmount > 0) {
                        state.activeBuffs.forEach(buff => {
                            if (buff.type === 'gold' || buff.type === 'buff') {
                                finalAmount = Math.floor(finalAmount * buff.value);
                            }
                        });

                        // Lucky star chance for double gold (rewards only, not penalties)
                        const luckySkill = state.skills.find(s => s.id === 'lucky-star');
                        if (luckySkill && luckySkill.currentLevel > 0 && Math.random() < (luckySkill.currentLevel * 0.05)) {
                            finalAmount *= 2;
                        }
                    }

                    set((state) => ({ gold: Math.max(0, state.gold + finalAmount) }));
                } catch (error) {
                    // Same as addXP: swallow ValidationErrors so callers without
                    // try/catch (toggleTask, completeHabit, etc.) don't crash.
                    console.error('addGold error:', error instanceof ValidationError ? error.message : error);
                }
            },

            addGems: (amount) => set((state) => ({ gems: state.gems + amount })),

            addShopItem: (name, cost) => {
                try {
                    const validatedName = validateShopItemName(name);
                    const validatedCost = validateCost(cost);
                    const newItem: Reward = { id: crypto.randomUUID(), name: validatedName, cost: validatedCost, purchased: false };
                    set((state) => ({ shopItems: [...state.shopItems, newItem] }));
                } catch (error) {
                    if (error instanceof ValidationError) {
                        console.error('Validation error:', error.message);
                    }
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

            checkStreak: () => {
                const state = get();
                const today = new Date().toISOString().split('T')[0];
                const lastActive = state.lastActiveDate;

                if (lastActive !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActive === yesterdayStr) {
                        // Consecutive day — streak grows
                        set({ streak: state.streak + 1, lastActiveDate: today });
                    } else if (!lastActive) {
                        // First login ever
                        set({ streak: 1, lastActiveDate: today });
                    } else {
                        // Missed a day — try to use a streak freeze
                        if (state.streakFreezes > 0 && state.lastFreezedDate !== today) {
                            set({
                                streakFreezes: state.streakFreezes - 1,
                                lastActiveDate: today,
                                lastFreezedDate: today,
                                // streak count preserved intentionally
                            });
                        } else {
                            // Streak broken — award a comeback bonus if the streak was meaningful
                            const oldStreak = state.streak;
                            const comebackBonus = oldStreak >= 3 ? Math.min(oldStreak * 10, 150) : 0;
                            set({ streak: 1, lastActiveDate: today, comebackBonusAmount: comebackBonus > 0 ? comebackBonus : null });
                            if (comebackBonus > 0) {
                                get().addXP(comebackBonus);
                            }
                        }
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
                    category: 'Other' as const,
                    recurring: 'daily' as const,
                    expiresAt: tomorrow.toISOString(),
                    isExpired: false,
                    isDaily: true
                }));

                set({ dailyQuests });
            },

            toggleDailyQuest: (questId) => {
                const state = get();
                const quest = state.dailyQuests.find(q => q.id === questId);
                // Check expiresAt directly rather than the stale isExpired flag, which is
                // only updated when checkDailyQuests() is called.
                if (!quest || new Date(quest.expiresAt) < new Date()) return;

                if (!quest.completed) {
                    // Completing: award XP and gold, then check achievements
                    get().addXP(quest.xpReward);
                    get().addGold(Math.floor(quest.xpReward / 2));
                    set((s) => ({
                        dailyQuests: s.dailyQuests.map(q =>
                            q.id === questId ? { ...q, completed: true } : q
                        )
                    }));
                    get().checkAchievements();
                } else {
                    // Uncompleting: reverse XP and gold
                    get().addXP(-quest.xpReward);
                    get().addGold(-Math.floor(quest.xpReward / 2));
                    set((s) => ({
                        dailyQuests: s.dailyQuests.map(q =>
                            q.id === questId ? { ...q, completed: false } : q
                        )
                    }));
                }
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

                // Apply class boss multiplier
                if (state.characterClass) {
                    damage = Math.floor(damage * CLASS_BONUSES[state.characterClass].bossMultiplier);
                }

                // Apply boss slayer skill bonus
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
                    // Use get() so rewards are applied to the post-set() store state
                    get().addXP(boss.xpReward);
                    get().addGold(boss.goldReward);
                    if (boss.itemReward) {
                        get().addItem(boss.itemReward);
                    }
                    get().unlockAchievement('BOSS_SLAYER');
                    get().logActivity('boss_damage', '💀', `Defeated ${boss.name}!`, `+${boss.xpReward} XP, +${boss.goldReward}g`);
                } else {
                    set((state) => ({
                        bossBattles: state.bossBattles.map(b =>
                            b.id === bossId ? { ...b, hp: newHp } : b
                        )
                    }));
                    get().logActivity('boss_damage', '⚔️', `Dealt ${damage} damage to ${boss.name}`, `${newHp}/${boss.maxHp} HP remaining`);
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

                // Normalize an itemId ("gold-coin", "dragon-scale") → "gold coin"
                // Use a global replace so multi-hyphen ids are fully converted.
                const normalizeId = (id: string) => id.replace(/-/g, ' ');

                // Match by exact id first, then by exact (case-insensitive) name.
                // Substring matching (.includes) was previously used, which risks
                // consuming the wrong item when the inventory has similarly-named entries
                // (e.g. "Mithril" matching "Mithril Dust").
                const findItem = (itemId: string) => state.inventory.find(i =>
                    i.id === itemId ||
                    i.name.toLowerCase() === normalizeId(itemId)
                );

                // Check if player has required items
                for (const input of recipe.inputs) {
                    const hasItem = findItem(input.itemId);
                    if (!hasItem || hasItem.quantity < input.quantity) {
                        return false;
                    }
                }

                // Remove input items (re-query current state in case a prior removeItem
                // already mutated the inventory for duplicate-ingredient recipes)
                for (const input of recipe.inputs) {
                    const item = get().inventory.find(i =>
                        i.id === input.itemId ||
                        i.name.toLowerCase() === normalizeId(input.itemId)
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



            // Buff Actions
            addBuff: (type, value, durationMinutes) => {
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

                set((state) => ({
                    // Remove any existing buff of the same type before adding the new one
                    // so the same buff cannot be stacked infinitely (e.g. buying 2x XP
                    // twice would otherwise compound to 4x XP).  Re-purchasing simply
                    // refreshes the duration.
                    activeBuffs: [
                        ...state.activeBuffs.filter(b => b.type !== type),
                        { type, value, expiresAt: expiresAt.toISOString() }
                    ]
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
                    const safeInt = (val: unknown, fallback: number) =>
                        typeof val === 'number' && isFinite(val) ? Math.max(0, Math.floor(val)) : fallback;
                    const safeArr = (val: unknown) => Array.isArray(val) ? val : [];
                    const safeStr = (val: unknown, fallback: string) =>
                        typeof val === 'string' ? val : fallback;

                    // Validate each nested array's elements so that a crafted save file
                    // cannot inject objects with wrong types that crash later access.
                    const isObj = (v: unknown): v is Record<string, unknown> =>
                        typeof v === 'object' && v !== null && !Array.isArray(v);

                    const safeTasks = safeArr(parsed.tasks).filter((t: unknown) =>
                        isObj(t) &&
                        typeof t.id === 'string' &&
                        typeof t.title === 'string' &&
                        typeof t.completed === 'boolean' &&
                        typeof t.xpReward === 'number'
                    );

                    const safeDailyQuests = safeArr(parsed.dailyQuests).filter((q: unknown) =>
                        isObj(q) &&
                        typeof q.id === 'string' &&
                        typeof q.title === 'string' &&
                        typeof q.completed === 'boolean'
                    );

                    const safeInventory = safeArr(parsed.inventory).filter((i: unknown) =>
                        isObj(i) &&
                        typeof i.id === 'string' &&
                        typeof i.name === 'string' &&
                        typeof i.quantity === 'number' && (i.quantity as number) >= 0
                    );

                    const safeSkills = safeArr(parsed.skills).filter((s: unknown) =>
                        isObj(s) &&
                        typeof s.id === 'string' &&
                        typeof s.currentLevel === 'number' &&
                        typeof s.maxLevel === 'number' &&
                        // Prevent importing a skill above its own maxLevel
                        (s.currentLevel as number) <= (s.maxLevel as number)
                    );

                    const safeQuestChains = safeArr(parsed.questChains).filter((c: unknown) =>
                        isObj(c) &&
                        typeof c.id === 'string' &&
                        typeof c.name === 'string' &&
                        typeof c.completed === 'boolean' &&
                        Array.isArray(c.steps)
                    );

                    const safeAchievements = safeArr(parsed.achievements).filter(
                        (a: unknown) => typeof a === 'string'
                    );

                    const safeTimelineEvents = safeArr(parsed.timelineEvents).filter((e: unknown) =>
                        isObj(e) &&
                        typeof e.id === 'string' &&
                        typeof e.title === 'string'
                    );

                    set({
                        xp: safeInt(parsed.xp, 0),
                        level: Math.max(1, safeInt(parsed.level, 1)),
                        gold: safeInt(parsed.gold, 0),
                        gems: safeInt(parsed.gems, 0),
                        tasks: safeTasks,
                        dailyQuests: safeDailyQuests,
                        inventory: safeInventory,
                        skills: safeSkills,
                        questChains: safeQuestChains,
                        streak: safeInt(parsed.streak, 0),
                        totalQuestsCompleted: safeInt(parsed.totalQuestsCompleted, 0),
                        loginStreak: safeInt(parsed.loginStreak, 0),
                        focusSessionsTotal: safeInt(parsed.focusSessionsTotal, 0),
                        focusMinutesTotal: safeInt(parsed.focusMinutesTotal, 0),
                        achievements: safeAchievements,
                        title: ((['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master', 'Grandmaster', 'Legend'] as const).includes(parsed.title as Title)
                            ? parsed.title
                            : 'Novice') as Title,
                        settings: parsed.settings && typeof parsed.settings === 'object'
                            ? parsed.settings
                            : { soundEnabled: true, theme: 'dark', musicEnabled: true, sfxVolume: 0.5, musicVolume: 0.3 },
                        characterClass: parsed.characterClass || null,
                        characterName: safeStr(parsed.characterName, 'Your Name'),
                        characterMotto: safeStr(parsed.characterMotto, 'Comfort is the enemy'),
                        characterStrengths: safeStr(parsed.characterStrengths, 'Disciplined, Organised, Creative'),
                        timelineEvents: safeTimelineEvents,
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

            addDynamicAchievement: (achievement) => {
                set((state) => ({
                    dynamicAchievements: [
                        { ...achievement, earnedAt: new Date().toISOString() },
                        ...state.dynamicAchievements
                    ]
                }));
                get().logActivity('achievement', achievement.icon || '🏆', `Earned "${achievement.name}"`, achievement.description);
            },

            checkAchievements: () => {
                const state = get();
                ACHIEVEMENTS.forEach((achievement) => {
                    if (!state.achievements.includes(achievement.id) && achievement.condition(state)) {
                        state.unlockAchievement(achievement.id);
                    }
                });
            },

            addTask: (title, difficulty = 'Medium', customXP, category = 'Other', recurring = 'none', duration) => {
                try {
                    const validatedTitle = validateTaskTitle(title);
                    const xpReward = customXP || DIFFICULTY_XP[difficulty];
                    const newTask: Task = {
                        id: crypto.randomUUID(),
                        title: validatedTitle,
                        completed: false,
                        xpReward,
                        difficulty,
                        category,
                        recurring,
                        duration
                    };
                    set((state) => ({ tasks: [...state.tasks, newTask] }));
                } catch (error) {
                    if (error instanceof ValidationError) {
                        console.error('Validation error:', error.message);
                    }
                    throw error;
                }
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

                        // Difficulty-scaled item drop chance + class bonus
                        const classDropBonus = state.characterClass ? CLASS_BONUSES[state.characterClass].dropBonus : 0;
                        const dropChance = ({ Easy: 0.10, Medium: 0.15, Hard: 0.25, Epic: 0.40 }[task.difficulty] ?? 0.15) + classDropBonus;
                        if (Math.random() < dropChance) {
                            const dropItems = [
                                { name: 'Health Potion', description: 'Restores health', type: 'consumable' as const, rarity: 'Common' as const, icon: '🧪' },
                                { name: 'Gold Coin', description: 'A shiny gold coin', type: 'material' as const, rarity: 'Common' as const, icon: '🪙' },
                                { name: 'XP Scroll', description: 'Grants bonus XP', type: 'consumable' as const, rarity: 'Uncommon' as const, icon: '📜' },
                                { name: 'Mystery Gem', description: 'A mysterious gem', type: 'material' as const, rarity: 'Rare' as const, icon: '💎' },
                                { name: 'Dragon Scale', description: 'A rare crafting material', type: 'material' as const, rarity: 'Epic' as const, icon: '🐉' },
                            ];
                            // Hard/Epic quests have better loot pools
                            const availableDrops = task.difficulty === 'Epic'
                                ? dropItems
                                : task.difficulty === 'Hard'
                                    ? dropItems.slice(0, 4)
                                    : dropItems.slice(0, 3);
                            const randomItem = availableDrops[Math.floor(Math.random() * availableDrops.length)];
                            const newItem: InventoryItem = {
                                ...randomItem,
                                id: crypto.randomUUID(),
                                quantity: 1,
                                stats: randomItem.rarity === 'Uncommon' ? { xpBonus: 10 }
                                    : randomItem.rarity === 'Rare' ? { xpBonus: 25, goldBonus: 10 }
                                        : randomItem.rarity === 'Epic' ? { xpBonus: 50, goldBonus: 25 }
                                            : undefined
                            };
                            set((s) => ({ inventory: [...s.inventory, newItem], lastDroppedItem: `${randomItem.icon} ${randomItem.name}` }));
                            get().logActivity('item_drop', randomItem.icon, `Found ${randomItem.name}`, `${randomItem.rarity} drop from "${task.title}"`);
                        }
                    } else {
                        state.addXP(-task.xpReward);
                        state.addGold(-Math.floor(task.xpReward / 2));
                        set((s) => ({ totalQuestsCompleted: Math.max(0, s.totalQuestsCompleted - 1) }));
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

                    if (!task.completed) {
                        const goldReward = Math.floor(task.xpReward / 2);
                        get().logActivity('quest_complete', '⚔️', `Completed "${task.title}"`, `+${task.xpReward} XP, +${goldReward}g`);
                    }

                    // Reset recurring tasks after a delay.
                    // We cancel any previously pending timer for this task before starting
                    // a new one so that toggling the task multiple times doesn't accumulate
                    // timers that later fire and reset the task on every cycle.
                    // We also capture `completedAt` now and verify it in the callback:
                    // if the user completed the task again between now and when the timer
                    // fires, the completedAt timestamp will differ and we skip the reset.
                    if (!task.completed && task.recurring && task.recurring !== 'none') {
                        const delay = task.recurring === 'daily' ? 86400000 : 604800000; // 24h or 7d
                        const completedAt = now; // captured from the set() above

                        const existing = recurringTaskTimers.get(id);
                        if (existing !== undefined) clearTimeout(existing);

                        const handle = setTimeout(() => {
                            recurringTaskTimers.delete(id);
                            const current = get().tasks.find(t => t.id === id);
                            // Only reset if still completed AND this is the same completion
                            // cycle we originally scheduled for (completedAt matches).
                            if (current?.completed && current.completedAt === completedAt) {
                                set((state) => ({
                                    tasks: state.tasks.map((t) =>
                                        t.id === id ? { ...t, completed: false, completedAt: undefined } : t
                                    )
                                }));
                            }
                        }, delay);

                        recurringTaskTimers.set(id, handle);
                    }

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
                        set((state) => ({
                            hp: Math.min(state.maxHp, state.hp + value)
                        }));
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

            resetSkill: (skillId) => {
                set((state) => {
                    const skill = state.skills.find(s => s.id === skillId);
                    if (!skill || skill.currentLevel === 0) return state;
                    // Refund 70% of XP spent on this skill
                    const xpRefund = Math.floor(
                        Array.from({ length: skill.currentLevel }, (_, i) => skill.cost * (i + 1)).reduce((a, b) => a + b, 0) * 0.7
                    );
                    return {
                        xp: state.xp + xpRefund,
                        skills: state.skills.map(s =>
                            s.id === skillId ? { ...s, currentLevel: 0 } : s
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

            buyGoldBuff: (type, durationMinutes, goldCost) => {
                // Perform the affordability check and deduction inside a single set()
                // so there is no window between reading gold and writing it.
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

            // Habit Actions
            addHabit: (name, icon, category, xpReward) => {
                try {
                    const validatedName = validateHabitName(name);
                    const newHabit: Habit = {
                        id: crypto.randomUUID(),
                        name: validatedName,
                        icon: icon.slice(0, 10), // Limit icon length
                        category,
                        xpReward,
                        streak: 0,
                        longestStreak: 0,
                        completedDates: [],
                        createdAt: new Date().toISOString(),
                        lastCompletedDate: null,
                    };
                    set((state) => ({ habits: [...state.habits, newHabit] }));
                } catch (error) {
                    if (error instanceof ValidationError) {
                        console.error('Validation error:', error.message);
                    }
                    throw error;
                }
            },

            completeHabit: (habitId) => {
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                const habit = get().habits.find(h => h.id === habitId);
                if (!habit || habit.completedDates.includes(today)) return;

                const newStreak = habit.lastCompletedDate === yesterdayStr ? habit.streak + 1 : 1;
                const newLongest = Math.max(newStreak, habit.longestStreak);

                set((state) => ({
                    habits: state.habits.map(h =>
                        h.id === habitId
                            ? { ...h, completedDates: [...h.completedDates, today], streak: newStreak, longestStreak: newLongest, lastCompletedDate: today }
                            : h
                    )
                }));

                get().addXP(habit.xpReward);
                get().addGold(Math.ceil(habit.xpReward / 5));
                get().logActivity('habit_complete', habit.icon || '✅', `Completed habit "${habit.name}"`, `${newStreak}-day streak, +${habit.xpReward} XP`);
            },

            deleteHabit: (habitId) => {
                set((state) => ({ habits: state.habits.filter(h => h.id !== habitId) }));
            },

            checkHabitResets: () => {
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                set((state) => ({
                    habits: state.habits.map(habit => {
                        // If last completed date is not today or yesterday, streak broke
                        if (habit.streak > 0 && habit.lastCompletedDate !== today && habit.lastCompletedDate !== yesterdayStr) {
                            return { ...habit, streak: 0 };
                        }
                        return habit;
                    })
                }));
            },

            // Goal Actions
            addGoal: (title, description, category, timeframe, targetDate, milestones, xpReward) => {
                try {
                    const validatedTitle = validateGoalTitle(title);
                    const validatedDescription = validateGoalDescription(description);
                    const validatedMilestones = milestones
                        .filter(m => m.trim())
                        .map(m => m.slice(0, 150)) // Limit milestone length
                        .slice(0, 20); // Limit number of milestones

                    const newGoal: Goal = {
                        id: crypto.randomUUID(),
                        title: validatedTitle,
                        description: validatedDescription,
                        category,
                        timeframe,
                        targetDate,
                        milestones: validatedMilestones.map(m => ({
                            id: crypto.randomUUID(),
                            title: m,
                            completed: false,
                        })),
                        completed: false,
                        createdAt: new Date().toISOString(),
                        xpReward,
                    };
                    set((state) => ({ goals: [...state.goals, newGoal] }));
                } catch (error) {
                    if (error instanceof ValidationError) {
                        console.error('Validation error:', error.message);
                    }
                    throw error;
                }
            },

            completeGoalMilestone: (goalId, milestoneId) => {
                const goal = get().goals.find(g => g.id === goalId);
                if (!goal || goal.completed) return;
                const wasAlreadyCompleted = goal.milestones.find(m => m.id === milestoneId)?.completed;
                if (wasAlreadyCompleted) return;

                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        const updatedMilestones = g.milestones.map(m =>
                            m.id === milestoneId ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
                        );
                        const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.completed);
                        return { ...g, milestones: updatedMilestones, completed: allDone, completedAt: allDone ? new Date().toISOString() : undefined };
                    })
                }));

                // If all milestones are now done, award XP + gold just like completeGoal
                const updatedGoal = get().goals.find(g => g.id === goalId);
                if (updatedGoal?.completed) {
                    get().addXP(updatedGoal.xpReward);
                    get().addGold(Math.ceil(updatedGoal.xpReward / 2));
                    get().logActivity('goal_milestone', '🎯', `Goal completed: "${updatedGoal.title}"`, `+${updatedGoal.xpReward} XP`);
                } else {
                    const milestone = goal.milestones.find(m => m.id === milestoneId);
                    const done = (updatedGoal?.milestones.filter(m => m.completed).length ?? 0);
                    const total = updatedGoal?.milestones.length ?? 0;
                    get().logActivity('goal_milestone', '🏁', `Milestone "${milestone?.title}" done`, `${done}/${total} on "${goal.title}"`);
                }
            },

            completeGoal: (goalId) => {
                const goal = get().goals.find(g => g.id === goalId);
                if (!goal || goal.completed) return;
                set((state) => ({
                    goals: state.goals.map(g => g.id === goalId ? { ...g, completed: true, completedAt: new Date().toISOString() } : g)
                }));
                get().addXP(goal.xpReward);
                get().addGold(Math.ceil(goal.xpReward / 2));
            },

            deleteGoal: (goalId) => {
                set((state) => ({ goals: state.goals.filter(g => g.id !== goalId) }));
            },

            // Intention & Reflection Actions
            setDailyIntention: (intention, energyRating) => {
                if (typeof intention !== 'string' || !intention.trim()) return;
                // energyRating is displayed in charts as a 1-5 scale; clamp to that range.
                const safeRating = Math.min(5, Math.max(1, Math.round(energyRating)));
                // Truncate intention to prevent runaway storage growth.
                const safeIntention = intention.trim().slice(0, 500);
                const today = new Date().toISOString().split('T')[0];
                set({ todayIntention: safeIntention, todayEnergyRating: safeRating, lastIntentionDate: today });
                // Small XP reward for setting intention
                get().addXP(10);
            },

            addReflectionNote: (note, stars, xpBonus) => {
                if (typeof note !== 'string' || !note.trim()) return;
                // stars is shown as a 1-5 rating; clamp to valid range.
                const safeStars = Math.min(5, Math.max(1, Math.round(stars)));
                // xpBonus comes from reflection quality UI (max reasonable value is 100).
                const safeBonus = Math.min(100, Math.max(0, Math.floor(xpBonus)));
                const safeNote = note.trim().slice(0, 2000);
                const today = new Date().toISOString().split('T')[0];
                set((state) => ({
                    lastReflectionDate: today,
                    reflectionNotes: [
                        { date: today, note: safeNote, stars: safeStars },
                        ...state.reflectionNotes.slice(0, 29) // keep last 30
                    ]
                }));
                if (safeBonus > 0) get().addXP(safeBonus);
                get().logActivity('reflection', '📝', `Daily reflection (${safeStars}★)`, safeBonus > 0 ? `+${safeBonus} XP` : undefined);
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
                // Capture the reward outside the set() callback so we can apply it after
                // the state update settles. Calling get() inside set() is unsafe because
                // the pending state hasn't been committed yet when get() would fire.
                let pendingReward: QuestChain['reward'] | null = null;

                set((state) => {
                    const chain = state.questChains.find(c => c.id === chainId);
                    if (!chain || chain.completed) return state;

                    const nextStep = chain.currentStep + 1;
                    const isComplete = nextStep >= chain.steps.length;

                    if (isComplete) {
                        pendingReward = chain.reward;
                        return {
                            questChains: state.questChains.map(c =>
                                c.id === chainId ? { ...c, completed: true, currentStep: nextStep } : c
                            )
                        };
                    }

                    return {
                        questChains: state.questChains.map(c =>
                            c.id === chainId ? { ...c, currentStep: nextStep } : c
                        )
                    };
                });

                // Apply rewards after set() has committed so every subsequent get() sees
                // the chain already marked completed (prevents any chance of double-reward).
                if (pendingReward) {
                    const reward = pendingReward as QuestChain['reward'];
                    get().addXP(reward.xp);
                    get().addGold(reward.gold);
                    if (reward.item) {
                        get().addItem(reward.item);
                    }
                }
            },

            completeQuestStep: (chainId, stepId) => {
                // Only mark the individual step as done here.
                // Do NOT set chain.completed — advanceQuestChain owns that decision
                // and will grant rewards. Setting it here would cause advanceQuestChain
                // to find chain.completed === true and return early, skipping rewards.
                set((state) => ({
                    questChains: state.questChains.map(chain => {
                        if (chain.id !== chainId) return chain;
                        return {
                            ...chain,
                            steps: chain.steps.map(step =>
                                step.id === stepId ? { ...step, completed: true } : step
                            )
                        };
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

                // Mark step as completed with the chosen branch recorded
                set((state) => ({
                    questChains: state.questChains.map(c =>
                        c.id !== chainId ? c : {
                            ...c,
                            steps: c.steps.map(s =>
                                s.id !== stepId ? s : { ...s, completed: true, chosenBranchId: branchId }
                            )
                        }
                    )
                }));

                // Award branch XP bonus
                if (branch.xpBonus > 0) get().addXP(branch.xpBonus);

                // Advance the chain to the next step
                get().advanceQuestChain(chainId);
            },

            updateGoalProgress: (goalId, progress) => {
                const safe = Math.min(100, Math.max(0, Math.round(progress)));
                set((state) => ({
                    goals: state.goals.map(g =>
                        g.id !== goalId ? g : { ...g, manualProgress: safe }
                    )
                }));
            },

            buyStreakFreeze: () => {
                const state = get();
                if (state.gems < 10) return;
                set({ gems: state.gems - 10, streakFreezes: state.streakFreezes + 1 });
            },

            addFocusSession: (minutesCompleted: number) => {
                const safeMins = Math.max(0, Math.floor(minutesCompleted));
                set((state) => ({
                    focusSessionsTotal: state.focusSessionsTotal + 1,
                    focusMinutesTotal: state.focusMinutesTotal + safeMins,
                }));
            },

            setFocusTimerRunning: (running: boolean, taskId: string | null = null) => {
                set({ isFocusTimerRunning: running, activeFocusTaskId: taskId });
            },

            setHP: (hp: number) => set({ hp }),
            takeDamage: (amount: number) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
            setMusicDucked: (ducked: boolean) => set({ isMusicDucked: ducked }),

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
                    focusSessionsTotal: 0,
                    focusMinutesTotal: 0,
                    achievements: [],
                    dynamicAchievements: [],
                    title: 'Novice',
                    habits: [],
                    goals: [],
                    activeBuffs: [],
                    activityLog: [],
                    isMusicDucked: false,
                    gems: 0,
                    hp: 100,
                    maxHp: 100
                });
            },
        }),
        {
            name: 'ai-productivity-storage',
            storage: createIndexedDBStorage<GameState>(),
            skipHydration: true,
            onRehydrateStorage: () => {
                // Called BEFORE getItem — reset the flag so that setItem skips
                // all persistence writes while the authoritative state is being
                // fetched.  This is critical when onAuthStateChange triggers a
                // second rehydrate(): without the reset, setItem would happily
                // flush stale/partial state to IndexedDB and Supabase.
                setHasHydrated(false);
                return () => {
                    // Called AFTER getItem resolves — guaranteed by persist middleware.
                    // This is the correct moment to allow Supabase saves.
                    setHasHydrated(true);
                };
            },
        }
    )
);
