import type { StateCreator } from 'zustand';
import type { GameState, CoreSlice, ActivityEntry, Title, VocabDifficulty } from '../types';
import {
    levelFromXP,
    CLASS_BONUSES,
    TITLE_REQUIREMENTS,
    ACTIVITY_LOG_MAX_ENTRIES,
} from '@/lib/constants';
import { CLASS_RESPEC_GOLD_COST } from '@/lib/rewardCalculator';
import {
    validateCharacterName,
    validateMotto,
    validateStrengths,
    ValidationError,
} from '@/lib/validation';
import { logger } from '@/lib/logger';

const ACHIEVEMENTS = [
    { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest', icon: '⚔️', condition: (s: GameState) => s.totalQuestsCompleted >= 1 },
    { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5', icon: '⭐', condition: (s: GameState) => s.level >= 5 },
    { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests', icon: '📜', condition: (s: GameState) => s.totalQuestsCompleted >= 10 },
    { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat a boss battle', icon: '🐉', condition: (s: GameState) => s.bossBattles.some(b => b.completed) },
    { id: 'CRAFTSMAN', name: 'Craftsman', description: 'Craft your first item', icon: '🔨', condition: (s: GameState) => s.inventory.some(i => i.name.includes('Blade') || i.name.includes('Shield') || i.name.includes('Potion')) },
    { id: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', condition: (s: GameState) => s.streak >= 7 },
    { id: 'TITLE_MASTER', name: 'Titled', description: 'Obtain the Master title', icon: '🎖️', condition: (s: GameState) => s.title === 'Master' },
    { id: 'DAILY_COMPLETE', name: 'Daily Grind', description: 'Complete all daily quests in a day', icon: '✅', condition: (s: GameState) => s.dailyQuests.length > 0 && s.dailyQuests.every(q => q.completed) },
    { id: 'LOGIN_30', name: 'Dedicated', description: 'Login 30 days in a row', icon: '📅', condition: (s: GameState) => s.loginStreak >= 30 },
    { id: 'QUEST_CENTURION', name: 'Centurion', description: 'Complete 100 quests', icon: '💯', condition: (s: GameState) => s.totalQuestsCompleted >= 100 },
    { id: 'STREAK_30', name: 'Streak Legend', description: 'Maintain a 30-day streak', icon: '👑', condition: (s: GameState) => s.streak >= 30 },
    { id: 'HABIT_HERO', name: 'Habit Hero', description: 'Complete a habit 7 days in a row', icon: '🏆', condition: (s: GameState) => s.habits.some(h => h.streak >= 7) },
    { id: 'GOAL_GETTER', name: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', condition: (s: GameState) => s.goals.some(g => g.completed) },
    { id: 'HABIT_BUILDER', name: 'Habit Builder', description: 'Create 5 habits', icon: '🌱', condition: (s: GameState) => s.habits.length >= 5 },
    { id: 'EPIC_SLAYER', name: 'Epic Slayer', description: 'Complete 10 Epic difficulty quests', icon: '⚡', condition: (s: GameState) => s.tasks.filter(t => t.completed && t.difficulty === 'Epic').length >= 10 },
    { id: 'LEVEL_20', name: 'Veteran', description: 'Reach Level 20', icon: '💎', condition: (s: GameState) => s.level >= 20 },
    { id: 'SCHOLAR_ELITE', name: 'Scholar Elite', description: 'Complete 25 Study quests', icon: '📚', condition: (s: GameState) => s.tasks.filter(t => t.completed && t.category === 'Study').length >= 25 },
    { id: 'HEALTH_WARRIOR', name: 'Health Warrior', description: 'Complete 25 Health quests', icon: '💪', condition: (s: GameState) => s.tasks.filter(t => t.completed && t.category === 'Health').length >= 25 },
    { id: 'REFLECTOR', name: 'Self Reflector', description: 'Submit 7 evening reflections', icon: '🌙', condition: (s: GameState) => s.reflectionNotes.length >= 7 },
    { id: 'WORDSMITH', name: 'Wordsmith', description: 'Master 10 vocabulary words', icon: '📖', condition: (s: GameState) => s.vocabWords.filter(w => w.status === 'mastered').length >= 10 },
    { id: 'LEXICON_LORD', name: 'Lexicon Lord', description: 'Master 50 vocabulary words', icon: '📚', condition: (s: GameState) => s.vocabWords.filter(w => w.status === 'mastered').length >= 50 },
    { id: 'VOCAB_STREAK_7', name: 'Word Warrior', description: 'Maintain a 7-day vocab review streak', icon: '🔤', condition: (s: GameState) => s.vocabStreak >= 7 },
];

export const createCoreSlice: StateCreator<GameState, [], [], CoreSlice> = (set, get) => ({
    // ── State ──
    xp: 0,
    level: 1,
    gold: 0,
    gems: 0,
    hp: 100,
    maxHp: 100,
    characterClass: null,
    characterName: 'Your Name',
    characterAge: '',
    characterYearLevel: '',
    characterMotto: 'Comfort is the enemy',
    characterStrengths: 'Disciplined, Organised, Creative',
    title: 'Novice' as Title,
    settings: { soundEnabled: true, theme: 'dark', musicEnabled: true, sfxVolume: 0.5, musicVolume: 0.3 },
    isMusicDucked: false,
    showLevelUp: false,
    lastDroppedItem: null,
    lastCriticalHit: null,
    comebackBonusAmount: null,
    achievements: [],
    dynamicAchievements: [],
    activityLog: [],

    // ── Actions ──
    addXP: (amount) => {
        try {
            const state = get();
            let finalAmount = amount;
            let isCritical = false;

            if (finalAmount > 0) {
                if (state.characterClass) {
                    finalAmount = Math.floor(finalAmount * CLASS_BONUSES[state.characterClass].xpMultiplier);
                }
                state.activeBuffs.forEach(buff => {
                    if (buff.type === 'xp' || buff.type === 'buff') {
                        finalAmount = Math.floor(finalAmount * buff.value);
                    }
                });
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
            logger.error('addXP error', 'store', error instanceof ValidationError ? error.message : error);
        }
    },

    addGold: (amount) => {
        try {
            const state = get();
            let finalAmount = amount;

            if (amount > 0 && state.characterClass) {
                finalAmount = Math.floor(finalAmount * CLASS_BONUSES[state.characterClass].goldMultiplier);
            }

            if (finalAmount > 0) {
                state.activeBuffs.forEach(buff => {
                    if (buff.type === 'gold' || buff.type === 'buff') {
                        finalAmount = Math.floor(finalAmount * buff.value);
                    }
                });
                const luckySkill = state.skills.find(s => s.id === 'lucky-star');
                if (luckySkill && luckySkill.currentLevel > 0 && Math.random() < (luckySkill.currentLevel * 0.05)) {
                    finalAmount *= 2;
                }
            }

            set((state) => ({ gold: Math.max(0, state.gold + finalAmount) }));
        } catch (error) {
            logger.error('addGold error', 'store', error instanceof ValidationError ? error.message : error);
        }
    },

    addGems: (amount) => set((state) => ({ gems: state.gems + amount })),

    setCharacterClass: (characterClass) => set({ characterClass }),

    respecClass: (newClass) => {
        const state = get();
        if (state.characterClass === null) {
            // First-time selection is free
            set({ characterClass: newClass });
            return true;
        }
        if (state.gold < CLASS_RESPEC_GOLD_COST) return false;
        const oldClass = state.characterClass;
        set(s => ({
            gold: s.gold - CLASS_RESPEC_GOLD_COST,
            characterClass: newClass,
        }));
        get().logActivity('purchase', '🔄', `Class respec: ${oldClass} → ${newClass}`, `-${CLASS_RESPEC_GOLD_COST}g`);
        return true;
    },

    updateCharacterInfo: (info) => {
        try {
            const validatedInfo: Partial<Pick<GameState, 'characterName' | 'characterAge' | 'characterYearLevel' | 'characterMotto' | 'characterStrengths'>> = {};
            if (info.characterName !== undefined) validatedInfo.characterName = validateCharacterName(info.characterName);
            if (info.characterAge !== undefined) validatedInfo.characterAge = info.characterAge.slice(0, 10);
            if (info.characterYearLevel !== undefined) validatedInfo.characterYearLevel = info.characterYearLevel.slice(0, 20);
            if (info.characterMotto !== undefined) validatedInfo.characterMotto = validateMotto(info.characterMotto);
            if (info.characterStrengths !== undefined) validatedInfo.characterStrengths = validateStrengths(info.characterStrengths);
            set((state) => ({ ...state, ...validatedInfo }));
        } catch (error) {
            if (error instanceof ValidationError) logger.error(`Validation error: ${error.message}`, 'store');
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

    updateSettings: (newSettings) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
    },

    setHP: (hp) => set({ hp }),
    takeDamage: (amount) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
    setMusicDucked: (ducked) => set({ isMusicDucked: ducked }),
    closeLevelUp: () => set({ showLevelUp: false }),
    clearDroppedItem: () => set({ lastDroppedItem: null }),
    clearCriticalHit: () => set({ lastCriticalHit: null }),
    clearComebackBonus: () => set({ comebackBonusAmount: null }),

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

    addDynamicAchievement: (achievement) => {
        set((state) => ({
            dynamicAchievements: [
                { ...achievement, earnedAt: new Date().toISOString() },
                ...state.dynamicAchievements
            ]
        }));
        get().logActivity('achievement', achievement.icon || '🏆', `Earned "${achievement.name}"`, achievement.description);
    },

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
            activityLog: [entry, ...state.activityLog].slice(0, ACTIVITY_LOG_MAX_ENTRIES),
        }));
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
            focusSessionsTotal: 0,
            focusMinutesTotal: 0,
            achievements: [],
            dynamicAchievements: [],
            title: 'Novice' as Title,
            habits: [],
            goals: [],
            activeBuffs: [],
            activityLog: [],
            isMusicDucked: false,
            gems: 0,
            hp: 100,
            maxHp: 100,
            vocabWords: [],
            vocabDailyDate: null,
            vocabCurrentLevel: 'intermediate' as VocabDifficulty,
            vocabStreak: 0,
            vocabLastReviewDate: null,
        });
    },

    exportSaveData: () => {
        const state = get();
        return JSON.stringify({
            xp: state.xp, level: state.level, gold: state.gold, gems: state.gems,
            tasks: state.tasks, dailyQuests: state.dailyQuests, inventory: state.inventory,
            skills: state.skills, questChains: state.questChains, streak: state.streak,
            totalQuestsCompleted: state.totalQuestsCompleted, loginStreak: state.loginStreak,
            achievements: state.achievements, title: state.title, settings: state.settings,
            characterClass: state.characterClass, characterName: state.characterName,
            characterMotto: state.characterMotto, characterStrengths: state.characterStrengths,
            timelineEvents: state.timelineEvents,
        });
    },

    importSaveData: (data) => {
        try {
            const parsed = JSON.parse(data);
            const safeInt = (val: unknown, fb: number) => typeof val === 'number' && isFinite(val) ? Math.max(0, Math.floor(val)) : fb;
            const safeArr = (val: unknown) => Array.isArray(val) ? val : [];
            const safeStr = (val: unknown, fb: string) => typeof val === 'string' ? val : fb;
            const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

            const safeTasks = safeArr(parsed.tasks).filter((t: unknown) => isObj(t) && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.completed === 'boolean' && typeof t.xpReward === 'number');
            const safeDailyQuests = safeArr(parsed.dailyQuests).filter((q: unknown) => isObj(q) && typeof q.id === 'string' && typeof q.title === 'string' && typeof q.completed === 'boolean');
            const safeInventory = safeArr(parsed.inventory).filter((i: unknown) => isObj(i) && typeof i.id === 'string' && typeof i.name === 'string' && typeof i.quantity === 'number' && (i.quantity as number) >= 0);
            const safeSkills = safeArr(parsed.skills).filter((s: unknown) => isObj(s) && typeof s.id === 'string' && typeof s.currentLevel === 'number' && typeof s.maxLevel === 'number' && (s.currentLevel as number) <= (s.maxLevel as number));
            const safeQuestChains = safeArr(parsed.questChains).filter((c: unknown) => isObj(c) && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.completed === 'boolean' && Array.isArray(c.steps));
            const safeAchievements = safeArr(parsed.achievements).filter((a: unknown) => typeof a === 'string');
            const safeTimelineEvents = safeArr(parsed.timelineEvents).filter((e: unknown) => isObj(e) && typeof e.id === 'string' && typeof e.title === 'string');

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
                title: ((['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master', 'Grandmaster', 'Legend'] as const).includes(parsed.title as Title) ? parsed.title : 'Novice') as Title,
                settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : { soundEnabled: true, theme: 'dark', musicEnabled: true, sfxVolume: 0.5, musicVolume: 0.3 },
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
});
