import type { StateCreator } from 'zustand';
import type { GameState, KnowledgeGraphSlice } from '../types';

export const createKnowledgeGraphSlice: StateCreator<GameState, [], [], KnowledgeGraphSlice> = (set) => ({
    // ── State ──
    knowledgeNodes: [],
    knowledgeEdges: [],
    dailyGrowthNodes: [],
    selectedKnowledgeNodeId: null,
    knowledgeFilters: {
        nodeTypes: ['word', 'concept', 'skill'],
        categories: [],
        dateRange: { start: null, end: null },
        masteryRange: [0, 1],
        searchQuery: '',
    },
    knowledgeViewMode: 'force',
    knowledgeLoading: false,

    // ── Actions ──
    setKnowledgeNodes: (nodes) => set({ knowledgeNodes: nodes }),
    setKnowledgeEdges: (edges) => set({ knowledgeEdges: edges }),
    setDailyGrowthNodes: (nodes) => set({ dailyGrowthNodes: nodes }),

    selectKnowledgeNode: (id) => set({ selectedKnowledgeNodeId: id }),

    setKnowledgeFilter: (key, value) =>
        set((state) => ({
            knowledgeFilters: { ...state.knowledgeFilters, [key]: value },
        })),

    setKnowledgeViewMode: (mode) => set({ knowledgeViewMode: mode }),
    setKnowledgeLoading: (loading) => set({ knowledgeLoading: loading }),

    addKnowledgeNodes: (nodes) =>
        set((state) => {
            const existing = new Set(state.knowledgeNodes.map((n) => n.id));
            const newNodes = nodes.filter((n) => !existing.has(n.id));
            // Update existing nodes (merge mentionCount, lastSeenAt)
            const updated = state.knowledgeNodes.map((n) => {
                const match = nodes.find((nn) => nn.id === n.id);
                if (!match) return n;
                return {
                    ...n,
                    mentionCount: match.mentionCount,
                    lastSeenAt: match.lastSeenAt,
                    masteryScore: match.masteryScore ?? n.masteryScore,
                };
            });
            return { knowledgeNodes: [...updated, ...newNodes] };
        }),

    addKnowledgeEdges: (edges) =>
        set((state) => {
            const existing = new Set(state.knowledgeEdges.map((e) => e.id));
            const newEdges = edges.filter((e) => !existing.has(e.id));
            const updated = state.knowledgeEdges.map((e) => {
                const match = edges.find((ee) => ee.id === e.id);
                return match ? { ...e, weight: match.weight } : e;
            });
            return { knowledgeEdges: [...updated, ...newEdges] };
        }),

    upsertDailyGrowthNode: (node) =>
        set((state) => {
            const idx = state.dailyGrowthNodes.findIndex((n) => n.logDate === node.logDate);
            if (idx >= 0) {
                const copy = [...state.dailyGrowthNodes];
                copy[idx] = node;
                return { dailyGrowthNodes: copy };
            }
            return { dailyGrowthNodes: [...state.dailyGrowthNodes, node] };
        }),
});
