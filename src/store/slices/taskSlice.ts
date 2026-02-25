import type { StateCreator } from 'zustand';
import type { GameState, TaskSlice, DailyQuest, BossBattle, InventoryItem } from '../types';
import { DIFFICULTY_XP, CLASS_BONUSES, DAILY_REWARDS, DAILY_QUEST_TEMPLATES } from '@/lib/constants';
import { validateTaskTitle, ValidationError } from '@/lib/validation';

// Module-level map: one active reset-timer per recurring task.
const recurringTaskTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const createTaskSlice: StateCreator<GameState, [], [], TaskSlice> = (set, get) => ({
    // ── State ──
    tasks: [],
    dailyQuests: [],
    bossBattles: [],
    lastActiveDate: null,
    streak: 0,
    streakFreezes: 0,
    lastFreezedDate: null,
    totalQuestsCompleted: 0,
    lastDailyRewardClaim: null,
    loginStreak: 0,

    // ── Actions ──
    addTask: (title, difficulty = 'Medium', customXP, category = 'Other', recurring = 'none', duration) => {
        try {
            const validatedTitle = validateTaskTitle(title);
            const xpReward = customXP || DIFFICULTY_XP[difficulty];
            const newTask = {
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
            if (error instanceof ValidationError) console.error('Validation error:', error.message);
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
                    const availableDrops = task.difficulty === 'Epic' ? dropItems : task.difficulty === 'Hard' ? dropItems.slice(0, 4) : dropItems.slice(0, 3);
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
                    t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } : t
                ),
                dailyQuests: state.dailyQuests.map((q) =>
                    q.id === id ? { ...q, completed: !q.completed } : q
                )
            }));

            if (!task.completed) {
                const goldReward = Math.floor(task.xpReward / 2);
                get().logActivity('quest_complete', '⚔️', `Completed "${task.title}"`, `+${task.xpReward} XP, +${goldReward}g`);
            }

            // Reset recurring tasks after a delay
            if (!task.completed && task.recurring && task.recurring !== 'none') {
                const delay = task.recurring === 'daily' ? 86400000 : 604800000;
                const completedAt = now;

                const existing = recurringTaskTimers.get(id);
                if (existing !== undefined) clearTimeout(existing);

                const handle = setTimeout(() => {
                    recurringTaskTimers.delete(id);
                    const current = get().tasks.find(t => t.id === id);
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
        const existingTimer = recurringTaskTimers.get(id);
        if (existingTimer !== undefined) {
            clearTimeout(existingTimer);
            recurringTaskTimers.delete(id);
        }
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    },

    restoreTask: (task) => {
        set((state) => ({ tasks: [...state.tasks, task] }));
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
                if (state.streakFreezes > 0 && state.lastFreezedDate !== today) {
                    set({ streakFreezes: state.streakFreezes - 1, lastActiveDate: today, lastFreezedDate: today });
                } else {
                    const oldStreak = state.streak;
                    const comebackBonus = oldStreak >= 3 ? Math.min(oldStreak * 10, 150) : 0;
                    set({ streak: 1, lastActiveDate: today, comebackBonusAmount: comebackBonus > 0 ? comebackBonus : null });
                    if (comebackBonus > 0) get().addXP(comebackBonus);
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

        const selected = [...DAILY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);

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
        if (!quest || new Date(quest.expiresAt) < new Date()) return;

        if (!quest.completed) {
            get().addXP(quest.xpReward);
            get().addGold(Math.floor(quest.xpReward / 2));
            set((s) => ({
                dailyQuests: s.dailyQuests.map(q => q.id === questId ? { ...q, completed: true } : q)
            }));
            get().checkAchievements();
        } else {
            get().addXP(-quest.xpReward);
            get().addGold(-Math.floor(quest.xpReward / 2));
            set((s) => ({
                dailyQuests: s.dailyQuests.map(q => q.id === questId ? { ...q, completed: false } : q)
            }));
        }
    },

    checkDailyQuests: () => {
        const state = get();
        const now = new Date();
        const updated = state.dailyQuests.map(q => ({ ...q, isExpired: new Date(q.expiresAt) < now }));
        const hasExpired = updated.some(q => q.isExpired && !q.completed);
        if (hasExpired || updated.length === 0) {
            get().generateDailyQuests();
        } else {
            set({ dailyQuests: updated });
        }
    },

    startBossBattle: (boss) => {
        const newBoss: BossBattle = { ...boss, id: crypto.randomUUID(), startsAt: new Date().toISOString(), completed: false, failed: false };
        set((state) => ({ bossBattles: [...state.bossBattles, newBoss] }));
    },

    damageBoss: (bossId, damage) => {
        const state = get();
        const boss = state.bossBattles.find(b => b.id === bossId);
        if (!boss || boss.completed || boss.failed) return;

        if (state.characterClass) {
            damage = Math.floor(damage * CLASS_BONUSES[state.characterClass].bossMultiplier);
        }
        const bossSlayerSkill = state.skills.find(s => s.id === 'boss-slayer');
        if (bossSlayerSkill && bossSlayerSkill.currentLevel > 0) {
            damage = Math.floor(damage * (1 + bossSlayerSkill.currentLevel * 0.05 * bossSlayerSkill.currentLevel));
        }

        const newHp = boss.hp - damage;

        if (newHp <= 0) {
            set((state) => ({ bossBattles: state.bossBattles.map(b => b.id === bossId ? { ...b, hp: 0, completed: true } : b) }));
            get().addXP(boss.xpReward);
            get().addGold(boss.goldReward);
            if (boss.itemReward) get().addItem(boss.itemReward);
            get().unlockAchievement('BOSS_SLAYER');
            get().logActivity('boss_damage', '💀', `Defeated ${boss.name}!`, `+${boss.xpReward} XP, +${boss.goldReward}g`);
        } else {
            set((state) => ({ bossBattles: state.bossBattles.map(b => b.id === bossId ? { ...b, hp: newHp } : b) }));
            get().logActivity('boss_damage', '⚔️', `Dealt ${damage} damage to ${boss.name}`, `${newHp}/${boss.maxHp} HP remaining`);
        }
    },

    failBossBattle: (bossId) => {
        set((state) => ({ bossBattles: state.bossBattles.map(b => b.id === bossId ? { ...b, failed: true } : b) }));
    },

    buyStreakFreeze: () => {
        const state = get();
        if (state.gems < 10) return;
        set({ gems: state.gems - 10, streakFreezes: state.streakFreezes + 1 });
    },
});
