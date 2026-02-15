import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    xpReward: number;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
    completedAt?: string; // ISO Date String
}

export interface Reward {
    id: string;
    name: string;
    cost: number;
    purchased: boolean; // For one-time items, or track count for consumables
}

interface GameState {
    xp: number;
    level: number;
    gold: number;
    tasks: Task[];
    shopItems: Reward[];
    purchasedRewards: Reward[]; // History of redeemed rewards

    // Streak
    lastActiveDate: string | null; // ISO Date string
    streak: number;

    // Actions
    addXP: (amount: number) => void;
    addTask: (title: string, difficulty?: Task['difficulty'], xp?: number) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    resetProgress: () => void;
    showLevelUp: boolean;
    closeLevelUp: () => void;
    achievements: string[];
    unlockAchievement: (id: string) => void;
    checkAchievements: () => void;

    // Economy Actions
    addGold: (amount: number) => void;
    buyReward: (rewardId: string) => void;
    addShopItem: (name: string, cost: number) => void;
    deleteShopItem: (id: string) => void;

    // Streak Actions
    checkStreak: () => void;
}

const DIFFICULTY_XP = {
    Easy: 10,
    Medium: 25,
    Hard: 50,
    Epic: 100,
};

const ACHIEVEMENTS = [
    { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest', condition: (state: GameState) => state.tasks.filter(t => t.completed).length >= 1 },
    { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5', condition: (state: GameState) => state.level >= 5 },
    { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests', condition: (state: GameState) => state.tasks.filter(t => t.completed).length >= 10 },
];

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            xp: 0,
            level: 1,
            gold: 0,
            tasks: [],
            shopItems: [], // Users will add their own
            purchasedRewards: [],
            lastActiveDate: null,
            streak: 0,

            showLevelUp: false,
            achievements: [],

            addXP: (amount) => {
                set((state) => {
                    const newXP = state.xp + amount;
                    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
                    const hasLeveledUp = newLevel > state.level;

                    return {
                        xp: newXP,
                        level: newLevel,
                        showLevelUp: hasLeveledUp || state.showLevelUp // Keep it true if already true
                    };
                });
                get().checkAchievements();
            },

            closeLevelUp: () => set({ showLevelUp: false }),

            addGold: (amount) => set((state) => ({ gold: state.gold + amount })),

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
                    // Play buy sound logic here later
                }
            },

            checkStreak: () => {
                const state = get();
                const today = new Date().toISOString().split('T')[0];
                const lastActive = state.lastActiveDate;

                if (lastActive !== today) {
                    // If it's a new day
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActive === yesterdayStr) {
                        // Perfect streak
                        set({ streak: state.streak + 1, lastActiveDate: today });
                    } else if (!lastActive) {
                        // First day
                        set({ streak: 1, lastActiveDate: today });
                    } else {
                        // Streak broken!
                        set({ streak: 1, lastActiveDate: today }); // Reset to 1 for today
                    }
                }
            },

            unlockAchievement: (id) => {
                set((state) => {
                    if (state.achievements.includes(id)) return state;
                    // Could enable an "Achievement Unlocked" modal here
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

            addTask: (title, difficulty = 'Medium', customXP) => {
                const xpReward = customXP || DIFFICULTY_XP[difficulty];
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    title,
                    completed: false,
                    xpReward,
                    difficulty,
                };
                set((state) => ({ tasks: [...state.tasks, newTask] }));
            },

            toggleTask: (id) => {
                const state = get();
                const task = state.tasks.find((t) => t.id === id);

                if (task) {
                    // If checking off (completing), award XP and Gold
                    if (!task.completed) {
                        state.addXP(task.xpReward);
                        // Gold reward logic: 10% of XP? Or simplified?
                        // Easy: 10xp -> 5 gold
                        // Medium: 25xp -> 10 gold
                        // Hard: 50xp -> 25 gold 
                        // Epic: 100xp -> 50 gold
                        const goldReward = Math.floor(task.xpReward / 2);
                        state.addGold(goldReward);

                        // Check streak on any completion
                        state.checkStreak();
                    } else {
                        // Deduct if unchecking
                        state.addXP(-task.xpReward);
                        state.addGold(-Math.floor(task.xpReward / 2));
                    }

                    const now = new Date().toISOString();

                    set((state) => ({
                        tasks: state.tasks.map((t) =>
                            t.id === id ? {
                                ...t,
                                completed: !t.completed,
                                completedAt: !t.completed ? now : undefined // Set date on complete, clear on uncheck
                            } : t
                        ),
                    }));

                    // Check achievements after state update
                    get().checkAchievements();
                }
            },

            deleteTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== id),
                }));
            },

            resetProgress: () => {
                set({ xp: 0, level: 1, tasks: [] });
            },
        }),
        {
            name: 'ai-productivity-storage',
        }
    )
);
