/**
 * Central type definitions for the game store.
 *
 * Every data interface and every slice's public surface is declared here
 * so that individual slice files can reference the full `GameState` type
 * without circular imports.
 */

import type { CharacterClass, Title } from '@/lib/constants';

// Re-export these so consumers that imported from useGameStore still work
export type { CharacterClass, Title };

// ─── Shared enums / branded types ────────────────────────────────

export type TaskCategory = 'Study' | 'Health' | 'Creative' | 'Work' | 'Social' | 'Personal' | 'Other';
export type TaskDuration = 'quick' | '1-hour' | 'half-day' | 'full-day' | 'multi-day' | 'week' | 'month';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material';
export type GoalTimeframe = 'week' | 'month' | 'quarter' | 'year' | 'lifetime';
export type ActivityType = 'quest_complete' | 'habit_complete' | 'item_drop' | 'level_up' | 'achievement' | 'reflection' | 'xp_earned' | 'boss_damage' | 'goal_milestone' | 'purchase';
export type VocabDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type VocabStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

// ─── Data interfaces ─────────────────────────────────────────────

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
    label: string;
    description: string;
    xpBonus: number;
}

export interface QuestStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    taskId?: string;
    branches?: StepBranch[];
    chosenBranchId?: string;
}

export interface Habit {
    id: string;
    name: string;
    icon: string;
    category: TaskCategory;
    xpReward: number;
    streak: number;
    longestStreak: number;
    completedDates: string[];
    createdAt: string;
    lastCompletedDate: string | null;
}

export interface VocabWord {
    id: string;
    word: string;
    definition: string;
    partOfSpeech: string;
    examples: string[];
    mnemonic: string;
    pronunciation: string;
    difficulty: VocabDifficulty;
    category: string;
    etymology?: string;
    relatedWords?: string[];
    antonym?: string;
    userMnemonic?: string;
    nextReviewDate: string;
    easeFactor: number;
    interval: number;
    repetitions: number;
    status: VocabStatus;
    confidenceRating?: number;
    lastConfidenceCorrect?: boolean;
    dateAdded: string;
    lastReviewed: string | null;
    totalReviews: number;
    correctReviews: number;
}

export interface VocabReviewResult {
    wordId: string;
    quality: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    category: TaskCategory;
    timeframe: GoalTimeframe;
    targetDate: string;
    milestones: GoalMilestone[];
    completed: boolean;
    completedAt?: string;
    createdAt: string;
    xpReward: number;
    manualProgress?: number;
}

export interface GoalMilestone {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
}

export interface ActivityEntry {
    id: string;
    type: ActivityType;
    icon: string;
    text: string;
    detail?: string;
    timestamp: string;
}

export interface Settings {
    soundEnabled: boolean;
    theme: 'dark' | 'light';
    musicEnabled: boolean;
    sfxVolume: number;
    musicVolume: number;
}

// ─── Slice interfaces ────────────────────────────────────────────

export interface CoreSlice {
    xp: number;
    level: number;
    gold: number;
    gems: number;
    hp: number;
    maxHp: number;
    characterClass: CharacterClass;
    characterName: string;
    characterAge: string;
    characterYearLevel: string;
    characterMotto: string;
    characterStrengths: string;
    title: Title;
    settings: Settings;
    isMusicDucked: boolean;
    showLevelUp: boolean;
    lastDroppedItem: string | null;
    lastCriticalHit: number | null;
    comebackBonusAmount: number | null;
    achievements: string[];
    dynamicAchievements: { name: string; description: string; icon: string; earnedAt: string }[];
    activityLog: ActivityEntry[];

    addXP: (amount: number) => void;
    addGold: (amount: number) => void;
    addGems: (amount: number) => void;
    setCharacterClass: (characterClass: CharacterClass) => void;
    updateCharacterInfo: (info: Partial<Pick<GameState, 'characterName' | 'characterAge' | 'characterYearLevel' | 'characterMotto' | 'characterStrengths'>>) => void;
    updateTitle: () => void;
    updateSettings: (settings: Partial<Settings>) => void;
    setHP: (hp: number) => void;
    takeDamage: (amount: number) => void;
    setMusicDucked: (ducked: boolean) => void;
    closeLevelUp: () => void;
    clearDroppedItem: () => void;
    clearCriticalHit: () => void;
    clearComebackBonus: () => void;
    unlockAchievement: (id: string) => void;
    checkAchievements: () => void;
    addDynamicAchievement: (achievement: { name: string; description: string; icon: string }) => void;
    logActivity: (type: ActivityType, icon: string, text: string, detail?: string) => void;
    resetProgress: () => void;
    exportSaveData: () => string;
    importSaveData: (data: string) => boolean;
}

export interface TaskSlice {
    tasks: Task[];
    dailyQuests: DailyQuest[];
    bossBattles: BossBattle[];
    lastActiveDate: string | null;
    streak: number;
    streakFreezes: number;
    lastFreezedDate: string | null;
    totalQuestsCompleted: number;
    lastDailyRewardClaim: string | null;
    loginStreak: number;

    addTask: (title: string, difficulty?: Task['difficulty'], xp?: number, category?: TaskCategory, recurring?: Task['recurring'], duration?: TaskDuration) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    restoreTask: (task: Task) => void;
    checkStreak: () => void;
    claimDailyReward: () => void;
    checkDailyQuests: () => void;
    generateDailyQuests: () => void;
    toggleDailyQuest: (questId: string) => void;
    startBossBattle: (boss: Omit<BossBattle, 'id' | 'startsAt' | 'completed' | 'failed'>) => void;
    damageBoss: (bossId: string, damage: number) => void;
    failBossBattle: (bossId: string) => void;
    buyStreakFreeze: () => void;
}

export interface RpgSlice {
    inventory: InventoryItem[];
    skills: Skill[];
    questChains: QuestChain[];
    craftingRecipes: CraftingRecipe[];
    equippedItems: {
        weapon?: InventoryItem;
        armor?: InventoryItem;
        accessory?: InventoryItem;
    };
    activeBuffs: { type: string; value: number; expiresAt: string }[];
    shopItems: Reward[];
    purchasedRewards: Reward[];

    addItem: (item: Omit<InventoryItem, 'id'>) => void;
    removeItem: (id: string, quantity?: number) => void;
    equipItem: (id: string) => void;
    unequipItem: (type: ItemType) => void;
    useItem: (id: string) => void;
    upgradeSkill: (skillId: string) => void;
    unlockSkill: (skillId: string) => void;
    resetSkill: (skillId: string) => void;
    getSkillMultiplier: (type: 'xp' | 'gold') => number;
    craftItem: (recipeId: string) => boolean;
    addBuff: (type: string, value: number, durationMinutes: number) => void;
    checkBuffs: () => void;
    buyGoldBuff: (type: 'xp' | 'gold', durationMinutes: number, goldCost: number) => boolean;
    addShopItem: (name: string, cost: number) => void;
    deleteShopItem: (id: string) => void;
    buyReward: (rewardId: string) => void;
    addQuestChain: (chain: Omit<QuestChain, 'id' | 'currentStep' | 'completed'>) => void;
    advanceQuestChain: (chainId: string) => void;
    completeQuestStep: (chainId: string, stepId: string) => void;
    chooseBranch: (chainId: string, stepId: string, branchId: string) => void;
}

export interface HabitSlice {
    habits: Habit[];

    addHabit: (name: string, icon: string, category: TaskCategory, xpReward: number) => void;
    completeHabit: (habitId: string) => void;
    deleteHabit: (habitId: string) => void;
    restoreHabit: (habit: Habit) => void;
    checkHabitResets: () => void;
}

export interface GoalSlice {
    goals: Goal[];
    timelineEvents: TimelineEvent[];
    lastIntentionDate: string | null;
    lastReflectionDate: string | null;
    todayIntention: string;
    todayEnergyRating: number;
    reflectionNotes: { date: string; note: string; stars: number }[];
    focusSessionsTotal: number;
    focusMinutesTotal: number;
    isFocusTimerRunning: boolean;
    activeFocusTaskId: string | null;

    addGoal: (title: string, description: string, category: TaskCategory, timeframe: GoalTimeframe, targetDate: string, milestones: string[], xpReward: number) => void;
    completeGoalMilestone: (goalId: string, milestoneId: string) => void;
    completeGoal: (goalId: string) => void;
    deleteGoal: (goalId: string) => void;
    restoreGoal: (goal: Goal) => void;
    updateGoalProgress: (goalId: string, progress: number) => void;
    addTimelineEvent: (name: string, date: string, subject: string, status: TimelineEvent['status'], statusColor: TimelineEvent['statusColor']) => void;
    updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
    deleteTimelineEvent: (id: string) => void;
    setDailyIntention: (intention: string, energyRating: number) => void;
    addReflectionNote: (note: string, stars: number, xpBonus: number) => void;
    addFocusSession: (minutesCompleted: number) => void;
    setFocusTimerRunning: (running: boolean, taskId: string | null) => void;
}

export interface VocabSlice {
    vocabWords: VocabWord[];
    vocabDailyDate: string | null;
    vocabCurrentLevel: VocabDifficulty;
    vocabStreak: number;
    vocabLastReviewDate: string | null;

    addVocabWords: (words: Omit<VocabWord, 'id' | 'dateAdded' | 'lastReviewed' | 'totalReviews' | 'correctReviews' | 'nextReviewDate' | 'easeFactor' | 'interval' | 'repetitions' | 'status'>[]) => void;
    reviewVocabWord: (wordId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
    setVocabDailyDate: (date: string) => void;
    updateVocabLevel: () => void;
    deleteVocabWord: (wordId: string) => void;
    restoreVocabWord: (word: VocabWord) => void;
    checkVocabStreak: () => void;
    setUserMnemonic: (wordId: string, mnemonic: string) => void;
    setWordConfidence: (wordId: string, confidence: number) => void;
}

// ─── Combined state ──────────────────────────────────────────────

export type GameState = CoreSlice & TaskSlice & RpgSlice & HabitSlice & GoalSlice & VocabSlice;
