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
    DailyCalendarEntry,
    GoalFormDraft,
    HabitFormDraft,
    ArgumentDraft,
    WeeklyPlanCache,
    KnowledgeNode,
    KnowledgeEdge,
    DailyGrowthNode,
    KnowledgeGraphFilters,
    KnowledgeNodeType,
    KnowledgeEdgeType,
    KnowledgeNodeSource,
    SkillCategory,
    Specialization,
    PassiveAbility,
    PrestigeState,
    ArenaGameMode,
    ArenaDifficulty,
    ArenaEnemy,
    ArenaBattleState,
    GauntletPuzzle,
    GauntletPuzzleType,
    ArenaGauntletState,
    MysteryStep,
    ArenaMysteryState,
    ArenaStats,
    DetectiveRank,
    KnowledgePillar,
    HitsOutputType,
    CognitiveFailureMode,
    ModelCard,
    TransferDrill,
    HitsOutput,
    MetacognitionReflection,
    RecallTest,
    WeeklySynthesis,
    HitsMonthlyChallenge,
    BiweeklySynthesisEssay,
    HitsScoreboard,
    HitsDailySession,
    SATSection,
    SATMathType,
    SATDifficulty,
    SATPassage,
    SATPassageQuestion,
    SATWritingQ,
    SATMathProblem,
    SATTestResult,
    SATScoreboard,
    SATDailySession,
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
import { createUiSlice } from './slices/uiSlice';
import { createKnowledgeGraphSlice } from './slices/knowledgeGraphSlice';
import { createArenaSlice } from './slices/arenaSlice';
import { createHitsSlice } from './slices/hitsSlice';
import { createSatSlice } from './slices/satSlice';

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
            ...createUiSlice(...a),
            ...createKnowledgeGraphSlice(...a),
            ...createArenaSlice(...a),
            ...createHitsSlice(...a),
            ...createSatSlice(...a),
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
