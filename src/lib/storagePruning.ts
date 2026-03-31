/**
 * IndexedDB Storage Pruning
 *
 * Enforces retention policies on unbounded arrays in the game store:
 * - activityLog: keep last 1000 entries
 * - knowledgeNodes: keep last 2000 (archive older to Supabase-only)
 * - knowledgeEdges: keep last 5000
 * - dailyCalendarEntries: keep last 365 days
 * - dailyGrowthNodes: keep last 365 days
 *
 * Called periodically (once per session on hydration).
 */
import { logger } from './logger';

export interface PrunableState {
    activityLog: { timestamp: string }[];
    knowledgeNodes: { lastSeenAt: string }[];
    knowledgeEdges: { id: string }[];
    dailyCalendarEntries: { date: string }[];
    dailyGrowthNodes: { logDate: string }[];
    hitsModelCards: { createdAt: string }[];
    hitsOutputs: { createdAt: string }[];
    hitsReflections: { createdAt: string }[];
}

const LIMITS = {
    activityLog: 1000,
    knowledgeNodes: 2000,
    knowledgeEdges: 5000,
    dailyCalendarEntries: 365,
    dailyGrowthNodes: 365,
    hitsModelCards: 500,
    hitsOutputs: 200,
    hitsReflections: 365,
};

export function pruneStorageState<T extends PrunableState>(state: T): T {
    let pruned = false;
    const result = { ...state };

    // Activity log: keep newest N entries
    if (result.activityLog?.length > LIMITS.activityLog) {
        result.activityLog = result.activityLog
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, LIMITS.activityLog);
        pruned = true;
    }

    // Knowledge nodes: keep by most recently seen
    if (result.knowledgeNodes?.length > LIMITS.knowledgeNodes) {
        result.knowledgeNodes = result.knowledgeNodes
            .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
            .slice(0, LIMITS.knowledgeNodes);
        pruned = true;
    }

    // Knowledge edges: keep newest N
    if (result.knowledgeEdges?.length > LIMITS.knowledgeEdges) {
        result.knowledgeEdges = result.knowledgeEdges.slice(-LIMITS.knowledgeEdges);
        pruned = true;
    }

    // Calendar entries: keep last N days
    if (result.dailyCalendarEntries?.length > LIMITS.dailyCalendarEntries) {
        result.dailyCalendarEntries = result.dailyCalendarEntries
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, LIMITS.dailyCalendarEntries);
        pruned = true;
    }

    // Daily growth nodes: keep last N days
    if (result.dailyGrowthNodes?.length > LIMITS.dailyGrowthNodes) {
        result.dailyGrowthNodes = result.dailyGrowthNodes
            .sort((a, b) => b.logDate.localeCompare(a.logDate))
            .slice(0, LIMITS.dailyGrowthNodes);
        pruned = true;
    }

    // HITS model cards: keep newest N
    if (result.hitsModelCards?.length > LIMITS.hitsModelCards) {
        result.hitsModelCards = result.hitsModelCards
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, LIMITS.hitsModelCards);
        pruned = true;
    }

    // HITS outputs: keep newest N
    if (result.hitsOutputs?.length > LIMITS.hitsOutputs) {
        result.hitsOutputs = result.hitsOutputs
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, LIMITS.hitsOutputs);
        pruned = true;
    }

    // HITS reflections: keep newest N
    if (result.hitsReflections?.length > LIMITS.hitsReflections) {
        result.hitsReflections = result.hitsReflections
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, LIMITS.hitsReflections);
        pruned = true;
    }

    if (pruned) {
        logger.info('Storage pruned to fit retention limits', 'storagePruning');
    }

    return result;
}
