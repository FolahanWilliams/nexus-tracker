import type { StateCreator } from 'zustand';
import type { GameState, KnowledgeGraphSlice } from '../types';

// ── XP rewards for knowledge graph growth ──
const XP_PER_NEW_NODE = 2;
const XP_PER_NEW_EDGE = 1;
const XP_CROSS_CLUSTER_EDGE = 5; // Bonus for connecting different categories

export const createKnowledgeGraphSlice: StateCreator<GameState, [], [], KnowledgeGraphSlice> = (set, get) => ({
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

            // Award XP for new nodes (+2 XP per new concept)
            if (newNodes.length > 0) {
                const xp = newNodes.length * XP_PER_NEW_NODE;
                // Use setTimeout to avoid set-within-set
                setTimeout(() => {
                    get().addXP(xp);
                    get().logActivity('xp_earned', '🧠', `+${xp} XP — ${newNodes.length} new knowledge node${newNodes.length > 1 ? 's' : ''}`, newNodes.map(n => n.label).slice(0, 5).join(', '));
                }, 0);
            }

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

            // Award XP for new edges (+1 XP per edge, +5 for cross-cluster)
            if (newEdges.length > 0) {
                let xp = newEdges.length * XP_PER_NEW_EDGE;
                // Check for cross-cluster connections
                const allNodes = [...state.knowledgeNodes];
                let crossCluster = 0;
                for (const edge of newEdges) {
                    const sourceNode = allNodes.find((n) => n.id === edge.sourceNodeId);
                    const targetNode = allNodes.find((n) => n.id === edge.targetNodeId);
                    if (sourceNode && targetNode && sourceNode.category !== targetNode.category) {
                        crossCluster++;
                    }
                }
                xp += crossCluster * XP_CROSS_CLUSTER_EDGE;

                if (xp > 0) {
                    setTimeout(() => {
                        get().addXP(xp);
                        const msg = crossCluster > 0
                            ? `+${xp} XP — ${newEdges.length} new connection${newEdges.length > 1 ? 's' : ''} (${crossCluster} cross-cluster!)`
                            : `+${xp} XP — ${newEdges.length} new connection${newEdges.length > 1 ? 's' : ''}`;
                        get().logActivity('xp_earned', '🔗', msg);
                    }, 0);
                }
            }

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
