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
export type ActivityType = 'quest_complete' | 'habit_complete' | 'item_drop' | 'level_up' | 'achievement' | 'reflection' | 'xp_earned' | 'boss_damage' | 'goal_milestone' | 'purchase' | 'arena_battle_won' | 'arena_gauntlet_complete' | 'arena_mystery_solved' | 'hits_block_complete' | 'hits_weekly_complete' | 'hits_monthly_complete';
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

export type SkillCategory = 'productivity' | 'combat' | 'magic' | 'crafting';
export type Specialization = 'Productivity' | 'Creativity' | 'Learning' | 'Fitness';

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
    category: SkillCategory;
    specialization?: Specialization;
    passive?: PassiveAbility;
    effects: {
        xpMultiplier?: number;
        goldMultiplier?: number;
        taskEfficiency?: number;
    };
}

export interface PassiveAbility {
    type: 'auto_complete_easy' | 'double_xp_weekends' | 'streak_shield' | 'bonus_daily_gold' | 'focus_burst' | 'creative_spark' | 'knowledge_retention' | 'endurance_boost';
    description: string;
    /** Minimum skill level required to activate this passive */
    activationLevel: number;
}

export interface PrestigeState {
    /** Number of times the player has prestiged */
    level: number;
    /** Permanent multiplier: 1 + (level * 0.1) */
    permanentMultiplier: number;
    /** Total XP earned across all prestiges (for display) */
    lifetimeXpEarned: number;
    /** Timestamp of last prestige */
    lastPrestigeAt: string | null;
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
    // SM-2 spaced repetition fields for smart habit scheduling
    /** SM-2 ease factor (1.3–3.0). Higher = easier to maintain. */
    habitEase: number;
    /** Current reminder interval in days. */
    habitInterval: number;
    /** Consecutive successful completions (for SM-2 progression). */
    habitReps: number;
    /** Next recommended focus date (YYYY-MM-DD). Used for priority sorting. */
    nextFocusDate: string;
    /** Total times the habit was missed after being scheduled. */
    totalMisses: number;
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
    /** Average response time in ms for recent quiz answers */
    avgResponseTimeMs?: number;
    /** Quiz types the user has failed on for this word */
    failedQuizTypes?: string[];
    /** Count of consecutive failures (resets on correct) */
    consecutiveFailures?: number;
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

export interface DailyCalendarEntry {
    date: string; // YYYY-MM-DD
    completed: boolean; // Did they show up and do their goals?
    summary: string; // Short summary of what they did
    learned: string; // What they learned today
    productivityScore: number; // 1-10 self-rated productivity score
    createdAt: string;
    updatedAt: string;
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
    dailyWordCount: 1 | 2 | 3 | 4;
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
    respecClass: (newClass: CharacterClass) => boolean;
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
    prestige: PrestigeState;

    addItem: (item: Omit<InventoryItem, 'id'>) => void;
    removeItem: (id: string, quantity?: number) => void;
    equipItem: (id: string) => void;
    unequipItem: (type: ItemType) => void;
    useItem: (id: string) => void;
    upgradeSkill: (skillId: string) => void;
    unlockSkill: (skillId: string) => void;
    resetSkill: (skillId: string) => void;
    getSkillMultiplier: (type: 'xp' | 'gold') => number;
    getActivePassives: () => PassiveAbility[];
    hasPassive: (type: PassiveAbility['type']) => boolean;
    prestigeReset: () => boolean;
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
    // Persistent focus timer state (survives page navigation)
    focusTimerEndTime: number | null; // Unix ms timestamp when running timer ends
    focusTimerPausedTimeLeft: number | null; // seconds remaining when paused
    focusTimerMode: 'focus' | 'short-break' | 'long-break';
    focusTimerSessionCount: number; // sessions completed in current pomodoro cycle
    dailyCalendarEntries: DailyCalendarEntry[];

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
    startFocusTimer: (mode: 'focus' | 'short-break' | 'long-break', durationSeconds: number, taskId: string | null) => void;
    pauseFocusTimer: (remainingSeconds: number) => void;
    stopFocusTimer: () => void;
    setFocusTimerMode: (mode: 'focus' | 'short-break' | 'long-break', durationSeconds: number) => void;
    setFocusTimerSessionCount: (count: number) => void;
    addOrUpdateCalendarEntry: (date: string, completed: boolean, summary: string, learned: string, productivityScore?: number) => void;
}

export interface VocabSlice {
    vocabWords: VocabWord[];
    vocabDailyDate: string | null;
    vocabCurrentLevel: VocabDifficulty;
    vocabStreak: number;
    vocabLastReviewDate: string | null;

    addVocabWords: (words: Omit<VocabWord, 'id' | 'dateAdded' | 'lastReviewed' | 'totalReviews' | 'correctReviews' | 'nextReviewDate' | 'easeFactor' | 'interval' | 'repetitions' | 'status'>[]) => void;
    reviewVocabWord: (wordId: string, quality: 0 | 1 | 2 | 3 | 4 | 5, meta?: { confidence?: number; responseTimeMs?: number; quizType?: string }) => void;
    setVocabDailyDate: (date: string) => void;
    updateVocabLevel: () => void;
    deleteVocabWord: (wordId: string) => void;
    restoreVocabWord: (word: VocabWord) => void;
    batchDeleteVocabWords: (wordIds: string[]) => void;
    batchRescheduleVocabWords: (wordIds: string[]) => void;
    batchSetVocabDifficulty: (wordIds: string[], difficulty: VocabDifficulty) => void;
    checkVocabStreak: () => void;
    setUserMnemonic: (wordId: string, mnemonic: string) => void;
    setWordConfidence: (wordId: string, confidence: number) => void;
}

// ─── Hoot Memory ────────────────────────────────────────────────

export interface HootMemoryNote {
    id: string;
    text: string;
    category: 'preference' | 'insight' | 'goal' | 'struggle' | 'general';
    createdAt: string;
}

export interface HootConversationSummary {
    id: string;
    summary: string;
    topics: string[];
    actionsTaken: string[];
    date: string;
}

/** Learned user preferences for Hoot personalization. */
export interface HootUserProfile {
    /** Preferred task difficulty based on completion patterns. */
    preferredDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic' | null;
    /** Peak productivity hours (e.g. "morning", "afternoon", "evening"). */
    peakProductivityTime: string | null;
    /** Categories the user completes most often. */
    topCategories: string[];
    /** Average daily tasks completed (rolling 7-day). */
    avgDailyTasks: number;
    /** Communication style preference. */
    coachingStyle: 'encouraging' | 'direct' | 'analytical' | null;
    /** Known struggles the user has mentioned. */
    knownStruggles: string[];
    /** Known goals extracted from conversations. */
    activeGoalSummaries: string[];
    /** Last time the profile was auto-updated. */
    lastProfileUpdate: string | null;
}

export interface HootMemory {
    notes: HootMemoryNote[];
    summaries: HootConversationSummary[];
    lastInteractionDate: string | null;
    /** Learned user profile for personalization. */
    userProfile: HootUserProfile;
}

export interface HootSlice {
    hootMemory: HootMemory;

    addHootMemoryNote: (text: string, category: HootMemoryNote['category']) => void;
    removeHootMemoryNote: (noteId: string) => void;
    addHootConversationSummary: (summary: string, topics: string[], actionsTaken: string[]) => void;
    updateHootLastInteraction: () => void;
    updateHootUserProfile: (updates: Partial<HootUserProfile>) => void;
    refreshUserProfile: () => void;
}

// ─── UI Persistence Slice ───────────────────────────────────────

export interface GoalFormDraft {
    title: string;
    description: string;
    category: TaskCategory;
    timeframe: GoalTimeframe;
    targetDate: string;
    milestones: string[];
    xpReward: number;
}

export interface HabitFormDraft {
    name: string;
    icon: string;
    category: TaskCategory;
    xp: number;
}

export interface ArgumentDraft {
    selectedTopic: string;
    claim: string;
    evidence: string;
    counterargument: string;
    rebuttal: string;
}

export interface WeeklyPlanCache {
    plan: { briefing: string; days: { day: string; focus: string; tasks: string[] }[]; insight: string } | null;
    generatedAt: string | null; // ISO date string
}

export interface UiSlice {
    // Tab selections
    uiTabs: Record<string, string>; // e.g. { mindforge: 'argument', wordforge: 'daily', ... }

    // Calendar view position
    uiCalendarYear: number;
    uiCalendarMonth: number;

    // Form drafts
    uiGoalDraft: GoalFormDraft | null;
    uiHabitDraft: HabitFormDraft | null;

    // MindForge argument builder draft
    uiArgumentDraft: ArgumentDraft | null;

    // Weekly plan cache
    uiWeeklyPlan: WeeklyPlanCache;

    // WordForge review session
    uiReviewMode: string | null; // 'study' | 'quiz' | 'recall' | null
    uiReviewQuizMode: string; // 'adaptive' | specific QuizType

    // Actions
    setUiTab: (page: string, tab: string) => void;
    setUiCalendarPosition: (year: number, month: number) => void;
    setUiGoalDraft: (draft: GoalFormDraft | null) => void;
    setUiHabitDraft: (draft: HabitFormDraft | null) => void;
    setUiArgumentDraft: (draft: ArgumentDraft | null) => void;
    setUiWeeklyPlan: (plan: WeeklyPlanCache['plan']) => void;
    setUiReviewMode: (mode: string | null) => void;
    setUiReviewQuizMode: (mode: string) => void;
}

// ─── Knowledge Graph ────────────────────────────────────────────

export type KnowledgeNodeType = 'word' | 'concept' | 'skill';
export type KnowledgeEdgeType = 'co_occurrence' | 'semantic' | 'vocab_concept' | 'prerequisite';
export type KnowledgeNodeSource = 'wordforge' | 'slight_edge' | 'reflection' | 'mindforge' | 'quest' | 'arena' | 'hits';

export interface KnowledgeNode {
    id: string;
    label: string;
    nodeType: KnowledgeNodeType;
    category: string;
    source: KnowledgeNodeSource;
    sourceId?: string;
    firstSeenAt: string;
    lastSeenAt: string;
    mentionCount: number;
    masteryScore: number | null; // 0-1, null for non-word nodes
    metadata?: Record<string, unknown>;
}

export interface KnowledgeEdge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: KnowledgeEdgeType;
    weight: number;
}

export interface DailyGrowthNode {
    id: string;
    logDate: string; // YYYY-MM-DD
    productivityScore: number;
    conceptsLearned: string[];
    habitsCompleted: string[];
    questsCompleted: number;
    wordsReviewed: number;
    focusMinutes: number;
    energyRating: number;
    logSummary: string;
}

export interface KnowledgeGraphFilters {
    nodeTypes: KnowledgeNodeType[];
    categories: string[];
    dateRange: { start: string | null; end: string | null };
    masteryRange: [number, number];
    searchQuery: string;
}

export interface KnowledgeGraphSlice {
    knowledgeNodes: KnowledgeNode[];
    knowledgeEdges: KnowledgeEdge[];
    dailyGrowthNodes: DailyGrowthNode[];
    selectedKnowledgeNodeId: string | null;
    knowledgeFilters: KnowledgeGraphFilters;
    knowledgeViewMode: 'force' | 'timeline' | 'cluster';
    knowledgeLoading: boolean;

    setKnowledgeNodes: (nodes: KnowledgeNode[]) => void;
    setKnowledgeEdges: (edges: KnowledgeEdge[]) => void;
    setDailyGrowthNodes: (nodes: DailyGrowthNode[]) => void;
    selectKnowledgeNode: (id: string | null) => void;
    setKnowledgeFilter: <K extends keyof KnowledgeGraphFilters>(key: K, value: KnowledgeGraphFilters[K]) => void;
    setKnowledgeViewMode: (mode: 'force' | 'timeline' | 'cluster') => void;
    setKnowledgeLoading: (loading: boolean) => void;
    addKnowledgeNodes: (nodes: KnowledgeNode[]) => void;
    addKnowledgeEdges: (edges: KnowledgeEdge[]) => void;
    upsertDailyGrowthNode: (node: DailyGrowthNode) => void;
}

// ─── Arena (Word Game) ─────────────────────────────────────────

export type ArenaGameMode = 'battle' | 'gauntlet' | 'mystery';
export type ArenaDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type DetectiveRank = 'Novice' | 'Sleuth' | 'Inspector' | 'Detective' | 'Mastermind';
export type GauntletPuzzleType = 'anagram' | 'word_chain' | 'crossword_clue' | 'cryptogram';

export interface ArenaEnemy {
    id: string;
    name: string;
    description: string;
    difficulty: ArenaDifficulty;
    hp: number;
    maxHp: number;
    attackDamage: number;
    specialAbility: 'removes_vowel' | 'steals_letter' | 'time_pressure' | 'double_attack' | null;
    imageHint: string;
}

export interface ArenaBattleState {
    enemy: ArenaEnemy | null;
    playerHp: number;
    playerMaxHp: number;
    letterPool: string[];
    currentTurn: number;
    maxTurns: number;
    wordsUsed: string[];
    vocabStrikes: number;
    totalDamageDealt: number;
    turnTimerDeadlineMs: number | null;
    lastAbilityMessage: string | null;
    status: 'idle' | 'active' | 'victory' | 'defeat';
}

export interface GauntletPuzzle {
    id: string;
    type: GauntletPuzzleType;
    prompt: string;
    hint?: string;
    answer: string;
    difficulty: ArenaDifficulty;
    bonusSeconds: number;
}

export interface ArenaGauntletState {
    puzzles: GauntletPuzzle[];
    currentPuzzleIndex: number;
    score: number;
    combo: number;
    maxCombo: number;
    timeRemainingMs: number;
    correctCount: number;
    incorrectCount: number;
    vocabBonuses: number;
    status: 'idle' | 'active' | 'finished';
}

export interface MysteryStep {
    id: string;
    riddle: string;
    hint1: string;
    hint2: string;
    hint3: string;
    answer: string;
    solved: boolean;
    hintsUsed: number;
    clueRevealed?: string;
}

export interface ArenaMysteryState {
    id: string | null;
    title: string;
    narrative: string;
    steps: MysteryStep[];
    currentStep: number;
    hintsUsedTotal: number;
    startedAt: string | null;
    status: 'idle' | 'active' | 'solved' | 'abandoned';
}

export interface ArenaStats {
    battlesWon: number;
    battlesLost: number;
    battleWinStreak: number;
    bestBattleWinStreak: number;
    gauntletHighScore: number;
    gauntletTotalPlayed: number;
    mysteriesSolved: number;
    mysteriesAbandoned: number;
    totalArenaXpEarned: number;
    totalArenaGoldEarned: number;
    detectiveRank: DetectiveRank;
}

export interface ArenaSlice {
    arenaMode: ArenaGameMode;
    arenaBattle: ArenaBattleState;
    arenaGauntlet: ArenaGauntletState;
    arenaMystery: ArenaMysteryState;
    arenaStats: ArenaStats;
    arenaLoading: boolean;

    setArenaMode: (mode: ArenaGameMode) => void;
    startBattle: (enemy: ArenaEnemy, letterPool: string[]) => void;
    submitBattleWord: (word: string, damage: number, isVocabStrike: boolean) => void;
    enemyAttack: () => void;
    endBattle: (victory: boolean) => void;
    refreshLetterPool: (newPool: string[]) => void;

    startGauntlet: (puzzles: GauntletPuzzle[]) => void;
    answerGauntletPuzzle: (correct: boolean, isVocabWord: boolean) => void;
    tickGauntletTimer: (elapsedMs: number) => void;
    addGauntletTime: (ms: number) => void;
    endGauntlet: () => void;

    startMystery: (id: string, title: string, narrative: string, steps: MysteryStep[]) => void;
    solveMysteryStep: (stepIndex: number) => void;
    useMysteryHint: (stepIndex: number) => void;
    endMystery: (solved: boolean) => void;
    abandonMystery: () => void;

    setArenaLoading: (loading: boolean) => void;
    resetArenaSession: () => void;
}

// ─── HITS (Horizontal Intelligence Training System) ────────────

export type KnowledgePillar = 'psychology' | 'strategy' | 'systems' | 'probability' | 'communication' | 'tech' | 'synthesis';
export type HitsOutputType = 'mini_essay' | 'founder_memo' | 'persuasion_pitch';
export type CognitiveFailureMode = 'rushed' | 'overconsumed' | 'avoided_hard_thinking' | 'stayed_abstract' | 'no_test' | 'confused_familiarity';

export interface ModelCard {
    id: string;
    name: string;
    definition: string;
    coreMechanism: string;
    examples: {
        history: string;
        business: string;
        startups: string;
        personal: string;
    };
    limitations: string;
    actionRule: string;
    keyQuestion: string;
    pillar: KnowledgePillar;
    createdAt: string;
    recallScore?: number;
    lastRecalledAt?: string;
}

export interface TransferDrill {
    id: string;
    modelCardId: string;
    analogies: [string, string, string];
    domains: [string, string, string];
    universalPrinciple: string;
    createdAt: string;
    aiScore?: number;
    aiFeedback?: string;
}

export interface HitsOutput {
    id: string;
    type: HitsOutputType;
    content: string;
    founderMemo?: {
        problem: string;
        insight: string;
        decision: string;
        risk: string;
        nextStep: string;
    };
    persuasionPitch?: {
        sentences: string[];
    };
    modelCardId?: string;
    createdAt: string;
    aiScore?: number;
    aiFeedback?: string;
}

export interface MetacognitionReflection {
    id: string;
    date: string;
    responses: string[];
    cognitiveFailureMode: CognitiveFailureMode;
    preventionPlan: string;
    createdAt: string;
}

export interface RecallTest {
    id: string;
    modelCardId: string;
    recalledName: string;
    recalledDefinition: string;
    recalledMechanism: string;
    recalledExample: string;
    recalledActionRule: string;
    score: number;
    aiFeedback?: string;
    createdAt: string;
}

export interface WeeklySynthesis {
    id: string;
    weekOf: string;
    topModels: [string, string, string];
    repeatingTheme: string;
    mindChangingModel: string;
    recurringMistake: string;
    newRule: string;
    experiment: string;
    speakingDrillTopic?: string;
    speakingDrillNotes?: string;
    deepWorkSprintTopic?: string;
    deepWorkSprintMinutes?: number;
    createdAt: string;
}

export interface HitsMonthlyChallenge {
    id: string;
    month: string;
    topic: string;
    analyses: {
        incentives: string;
        compounding: string;
        feedbackLoops: string;
        secondOrderEffects: string;
    };
    completed: boolean;
    createdAt: string;
}

export interface BiweeklySynthesisEssay {
    id: string;
    periodStart: string;
    content: string;
    createdAt: string;
}

export interface HitsScoreboard {
    modelCardsThisWeek: number;
    speakingRepsThisWeek: number;
    essaysThisWeek: number;
    synthesisThisWeek: number;
    founderDocsThisWeek: number;
    deepWorkSprintsThisWeek: number;
    weekStartDate: string;
    totalModelCards: number;
    totalEssays: number;
    totalSpeakingReps: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
}

export interface HitsDailySession {
    date: string;
    pillar: KnowledgePillar;
    blockAComplete: boolean;
    blockBComplete: boolean;
    blockCComplete: boolean;
    blockDComplete: boolean;
    blockEComplete: boolean;
}

export interface HitsSlice {
    hitsModelCards: ModelCard[];
    hitsTransferDrills: TransferDrill[];
    hitsOutputs: HitsOutput[];
    hitsReflections: MetacognitionReflection[];
    hitsRecallTests: RecallTest[];
    hitsWeeklySyntheses: WeeklySynthesis[];
    hitsMonthlyChallenges: HitsMonthlyChallenge[];
    hitsBiweeklyEssays: BiweeklySynthesisEssay[];
    hitsScoreboard: HitsScoreboard;
    hitsDailySession: HitsDailySession | null;

    addModelCard: (card: Omit<ModelCard, 'id' | 'createdAt'>) => void;
    deleteModelCard: (id: string) => void;
    addTransferDrill: (drill: Omit<TransferDrill, 'id' | 'createdAt'>) => void;
    addHitsOutput: (output: Omit<HitsOutput, 'id' | 'createdAt'>) => void;
    addReflection: (reflection: Omit<MetacognitionReflection, 'id' | 'createdAt'>) => void;
    addRecallTest: (test: Omit<RecallTest, 'id' | 'createdAt'>) => void;
    addWeeklySynthesis: (synthesis: Omit<WeeklySynthesis, 'id' | 'createdAt'>) => void;
    updateWeeklySynthesis: (id: string, updates: Partial<WeeklySynthesis>) => void;
    addMonthlyChallenge: (challenge: Omit<HitsMonthlyChallenge, 'id' | 'createdAt' | 'completed'>) => void;
    completeMonthlyChallenge: (id: string) => void;
    addBiweeklyEssay: (essay: Omit<BiweeklySynthesisEssay, 'id' | 'createdAt'>) => void;
    initDailySession: () => void;
    markBlockComplete: (block: 'A' | 'B' | 'C' | 'D' | 'E') => void;
    refreshScoreboard: () => void;
}

// ─── Combined state ──────────────────────────────────────────────

export type GameState = CoreSlice & TaskSlice & RpgSlice & HabitSlice & GoalSlice & VocabSlice & HootSlice & UiSlice & KnowledgeGraphSlice & ArenaSlice & HitsSlice;
