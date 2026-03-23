import { useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { KnowledgeNode, KnowledgeEdge, KnowledgeNodeSource, DailyGrowthNode } from '@/store/useGameStore';

/**
 * Hook that extracts concepts from text (via API or local fallback)
 * and upserts them into the knowledge graph store.
 */
export function useConceptExtraction() {
    const {
        knowledgeNodes, addKnowledgeNodes, addKnowledgeEdges,
        upsertDailyGrowthNode, habits, tasks,
    } = useGameStore();

    const extractAndStore = useCallback(async (
        text: string,
        source: KnowledgeNodeSource,
        sourceId: string,
        date?: string,
    ) => {
        if (!text || text.trim().length < 3) return;

        const existingLabels = knowledgeNodes.map((n) => n.label);
        const now = new Date().toISOString();

        try {
            const res = await fetch('/api/knowledge-graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, source, sourceId, existingLabels }),
            });
            const data = await res.json();

            if (data.concepts?.length > 0) {
                const nodes: KnowledgeNode[] = data.concepts.map(
                    (c: { label: string; category: string; confidence: number }) => {
                        const existing = knowledgeNodes.find(
                            (n) => n.label === c.label
                        );
                        return {
                            id: existing?.id || `concept-${c.label}`,
                            label: c.label,
                            nodeType: 'concept' as const,
                            category: c.category || 'other',
                            source,
                            sourceId,
                            firstSeenAt: existing?.firstSeenAt || now,
                            lastSeenAt: now,
                            mentionCount: (existing?.mentionCount || 0) + 1,
                            masteryScore: null,
                        };
                    }
                );
                addKnowledgeNodes(nodes);

                if (data.relationships?.length > 0) {
                    const edges: KnowledgeEdge[] = data.relationships
                        .filter((r: { from: string; to: string }) => {
                            return nodes.some((n) => n.label === r.from) &&
                                nodes.some((n) => n.label === r.to);
                        })
                        .map((r: { from: string; to: string; type: string; weight: number }) => {
                            const fromNode = nodes.find((n) => n.label === r.from)!;
                            const toNode = nodes.find((n) => n.label === r.to)!;
                            return {
                                id: `edge-${fromNode.id}-${toNode.id}-${r.type}`,
                                sourceNodeId: fromNode.id,
                                targetNodeId: toNode.id,
                                edgeType: r.type as KnowledgeEdge['edgeType'],
                                weight: r.weight || 0.5,
                            };
                        });
                    addKnowledgeEdges(edges);
                }

                // Also upsert daily growth node if date provided
                if (date) {
                    const dayHabits = habits
                        .filter((h) => h.completedDates.includes(date))
                        .map((h) => h.name);
                    const dayQuests = tasks.filter(
                        (t) => t.completed && t.completedAt?.startsWith(date)
                    ).length;

                    const growthNode: DailyGrowthNode = {
                        id: `day-${date}`,
                        logDate: date,
                        productivityScore: 5,
                        conceptsLearned: nodes.map((n) => n.label),
                        habitsCompleted: dayHabits,
                        questsCompleted: dayQuests,
                        wordsReviewed: 0,
                        focusMinutes: 0,
                        energyRating: 5,
                        logSummary: text.slice(0, 200),
                    };
                    upsertDailyGrowthNode(growthNode);
                }
            }
        } catch {
            // Fallback: simple local extraction without AI
            const keywords = text
                .split(/[,;\.\n]/)
                .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
                .filter((s) => s.length >= 3 && s.length < 40);

            if (keywords.length > 0) {
                const nodes: KnowledgeNode[] = keywords.map((kw) => {
                    const existing = knowledgeNodes.find((n) => n.label === kw);
                    return {
                        id: existing?.id || `concept-${kw}`,
                        label: kw,
                        nodeType: 'concept' as const,
                        category: 'other',
                        source,
                        sourceId,
                        firstSeenAt: existing?.firstSeenAt || now,
                        lastSeenAt: now,
                        mentionCount: (existing?.mentionCount || 0) + 1,
                        masteryScore: null,
                    };
                });
                addKnowledgeNodes(nodes);
            }
        }
    }, [knowledgeNodes, addKnowledgeNodes, addKnowledgeEdges, upsertDailyGrowthNode, habits, tasks]);

    /**
     * Sync WordForge mastery scores to word-type knowledge nodes.
     */
    const syncVocabMastery = useCallback(() => {
        const vocabWords = useGameStore.getState().vocabWords;
        const nodes: KnowledgeNode[] = vocabWords.map((w) => {
            const mastery = w.status === 'mastered' ? 1 :
                w.status === 'reviewing' ? 0.7 :
                    w.status === 'learning' ? 0.4 : 0.1;
            return {
                id: `word-${w.id}`,
                label: w.word.toLowerCase(),
                nodeType: 'word' as const,
                category: w.category || 'language',
                source: 'wordforge' as const,
                sourceId: w.id,
                firstSeenAt: w.dateAdded,
                lastSeenAt: w.lastReviewed || w.dateAdded,
                mentionCount: w.totalReviews || 1,
                masteryScore: mastery,
            };
        });
        if (nodes.length > 0) addKnowledgeNodes(nodes);
    }, [addKnowledgeNodes]);

    return { extractAndStore, syncVocabMastery };
}
