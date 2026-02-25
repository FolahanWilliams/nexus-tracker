/**
 * Composed game store.
 *
 * Individual domain logic lives in src/store/slices/*.ts.
 * This file composes all slices into a single Zustand store with
 * IndexedDB + Supabase persistence and re-exports every type so that
 * existing consumer imports (`from '@/store/useGameStore'`) continue
 * to work unchanged.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIndexedDBStorage, setHasHydrated } from '@/lib/zustandStorage';

import type { GameState } from './types';

// Re-export all types for backward compatibility
export type {
    GameState,
    Task,
    DailyQuest,
    BossBattle,
    Reward,
    TimelineEvent,
    InventoryItem,
    CraftingRecipe,
    Skill,
    QuestChain,
    QuestStep,
    StepBranch,
    Habit,
    VocabWord,
    VocabReviewResult,
    Goal,
    GoalMilestone,
    ActivityEntry,
    Settings,
    TaskCategory,
    TaskDuration,
    ItemRarity,
    ItemType,
    GoalTimeframe,
    ActivityType,
    VocabDifficulty,
    VocabStatus,
    CharacterClass,
    Title,
    HootMemory,
    HootMemoryNote,
    HootConversationSummary,
} from './types';

// Re-export constants that were previously exported from this file
export {
    xpForLevel,
    levelFromXP,
    CLASS_BONUSES,
    TITLE_REQUIREMENTS,
    DIFFICULTY_XP,
} from '@/lib/constants';

// Import slice creators
import { createCoreSlice } from './slices/coreSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createRpgSlice } from './slices/rpgSlice';
import { createHabitSlice } from './slices/habitSlice';
import { createGoalSlice } from './slices/goalSlice';
import { createVocabSlice } from './slices/vocabSlice';
import { createHootSlice } from './slices/hootSlice';

// ─── Compose store ───────────────────────────────────────────────

export const useGameStore = create<GameState>()(
    persist(
        (...a) => ({
            ...createCoreSlice(...a),
            ...createTaskSlice(...a),
            ...createRpgSlice(...a),
            ...createHabitSlice(...a),
            ...createGoalSlice(...a),
            ...createVocabSlice(...a),
            ...createHootSlice(...a),
        }),
        {
            name: 'ai-productivity-storage',
            storage: createIndexedDBStorage<GameState>(),
            skipHydration: true,
            onRehydrateStorage: () => {
                setHasHydrated(false);
                return () => {
                    setHasHydrated(true);
                };
            },
        }
    )
);
