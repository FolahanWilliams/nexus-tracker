import { useCallback, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { KnowledgeNode, KnowledgeEdge, KnowledgeNodeSource } from '@/store/useGameStore';

const EXTRACT_DEBOUNCE_MS = 2000;

/**
 * Hook that extracts concepts from text (via API or local fallback)
 * and upserts them into the knowledge graph store.
 *
 * Uses getState() to avoid stale closures over knowledgeNodes.
 * Debounces API calls to prevent Gemini spam on rapid edits.
 */
export function useConceptExtraction() {
    const addKnowledgeNodes = useGameStore((s) => s.addKnowledgeNodes);
    const addKnowledgeEdges = useGameStore((s) => s.addKnowledgeEdges);
    const upsertDailyGrowthNode = useGameStore((s) => s.upsertDailyGrowthNode);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Simple local keyword extraction (no AI needed).
     * Used as fallback and for quick inline extraction.
     */
    const localExtract = useCallback((
        text: string,
        source: KnowledgeNodeSource,
        sourceId: string,
    ) => {
        const now = new Date().toISOString();
        const currentNodes = useGameStore.getState().knowledgeNodes;
        const keywords = text
            .split(/[,;\.\n]/)
            .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
            .filter((s) => s.length >= 3 && s.length < 40);

        if (keywords.length > 0) {
            const nodes: KnowledgeNode[] = keywords.map((kw) => {
                const existing = currentNodes.find((n) => n.label === kw);
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
    }, [addKnowledgeNodes]);

    /**
     * Internal extraction logic (not debounced).
     */
    const _doExtract = useCallback(async (
        text: string,
        source: KnowledgeNodeSource,
        sourceId: string,
        date?: string,
    ) => {
        if (!text || text.trim().length < 3) return;

        const state = useGameStore.getState();
        const existingLabels = state.knowledgeNodes.map((n) => n.label);
        const now = new Date().toISOString();

        try {
            const res = await fetch('/api/knowledge-graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, source, sourceId, existingLabels }),
            });
            const data = await res.json();

            if (data.concepts?.length > 0) {
                const currentNodes = useGameStore.getState().knowledgeNodes;
                const nodes: KnowledgeNode[] = data.concepts.map(
                    (c: { label: string; category: string; confidence: number }) => {
                        const existing = currentNodes.find((n) => n.label === c.label);
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
                        .filter((r: { from: string; to: string }) =>
                            nodes.some((n) => n.label === r.from) &&
                            nodes.some((n) => n.label === r.to)
                        )
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

                // ── Semantic similarity: compute hidden connections via GET endpoint ──
                const newLabels = nodes.map((n) => n.label);
                if (newLabels.length > 0 && existingLabels.length > 0) {
                    try {
                        const simRes = await fetch(
                            `/api/knowledge-graph?concepts=${encodeURIComponent(newLabels.join(','))}&existing=${encodeURIComponent(existingLabels.join(','))}`
                        );
                        const simData = await simRes.json();
                        if (simData.similarities?.length > 0) {
                            const latestNodes = useGameStore.getState().knowledgeNodes;
                            const semanticEdges: KnowledgeEdge[] = simData.similarities
                                .filter((s: { from: string; to: string; score: number }) => s.score >= 0.6)
                                .map((s: { from: string; to: string; score: number }) => {
                                    const fromN = latestNodes.find((n) => n.label === s.from);
                                    const toN = latestNodes.find((n) => n.label === s.to);
                                    if (!fromN || !toN || fromN.id === toN.id) return null;
                                    return {
                                        id: `edge-${fromN.id}-${toN.id}-semantic`,
                                        sourceNodeId: fromN.id,
                                        targetNodeId: toN.id,
                                        edgeType: 'semantic' as const,
                                        weight: s.score,
                                    };
                                })
                                .filter(Boolean) as KnowledgeEdge[];
                            if (semanticEdges.length > 0) {
                                addKnowledgeEdges(semanticEdges);
                            }
                        }
                    } catch {
                        // Semantic similarity is optional — don't block on failure
                    }
                }

                // Also upsert daily growth node if date provided
                if (date) {
                    const s = useGameStore.getState();
                    const dayHabits = s.habits
                        .filter((h) => h.completedDates.includes(date))
                        .map((h) => h.name);
                    const dayQuests = s.tasks.filter(
                        (t) => t.completed && t.completedAt?.startsWith(date)
                    ).length;

                    upsertDailyGrowthNode({
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
                    });
                }
            }
        } catch {
            // Fallback: simple local keyword extraction without AI
            localExtract(text, source, sourceId);
        }
    }, [addKnowledgeNodes, addKnowledgeEdges, upsertDailyGrowthNode, localExtract]);

    /**
     * Debounced extract: cancels previous calls if triggered within 2s.
     * Prevents Gemini API spam when user rapidly edits and saves.
     */
    const extractAndStore = useCallback((
        text: string,
        source: KnowledgeNodeSource,
        sourceId: string,
        date?: string,
    ) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            _doExtract(text, source, sourceId, date);
        }, EXTRACT_DEBOUNCE_MS);
    }, [_doExtract]);

    /**
     * Sync all WordForge mastery scores to word-type knowledge nodes.
     * Call after vocab reviews to keep the graph in sync.
     */
    const syncVocabMastery = useCallback(() => {
        const { vocabWords } = useGameStore.getState();
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

    /**
     * Feed a MindForge exercise result into the knowledge graph.
     * Creates concept/skill nodes for the topics and links them.
     */
    const feedMindForgeResult = useCallback((
        exerciseType: 'argument' | 'analogy' | 'summary' | 'speaking',
        topic: string,
        score: number,
        extras?: { conceptA?: string; conceptB?: string; vocabWordsUsed?: string[] },
    ) => {
        const now = new Date().toISOString();
        const currentNodes = useGameStore.getState().knowledgeNodes;
        const nodes: KnowledgeNode[] = [];
        const edges: KnowledgeEdge[] = [];

        // Normalize topic into a label
        const topicLabel = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
        if (topicLabel.length < 3) return;

        const categoryMap: Record<string, string> = {
            argument: 'personal-development',
            analogy: 'creative',
            summary: 'personal-development',
            speaking: 'personal-development',
        };

        // Main topic node
        const existingTopic = currentNodes.find((n) => n.label === topicLabel);
        const topicNode: KnowledgeNode = {
            id: existingTopic?.id || `concept-${topicLabel}`,
            label: topicLabel,
            nodeType: 'concept',
            category: categoryMap[exerciseType] || 'other',
            source: 'mindforge',
            sourceId: `${exerciseType}-${Date.now()}`,
            firstSeenAt: existingTopic?.firstSeenAt || now,
            lastSeenAt: now,
            mentionCount: (existingTopic?.mentionCount || 0) + 1,
            masteryScore: null,
        };
        nodes.push(topicNode);

        // Skill node for the exercise type itself
        const skillLabel = `${exerciseType}-skill`;
        const existingSkill = currentNodes.find((n) => n.label === skillLabel);
        const skillNode: KnowledgeNode = {
            id: existingSkill?.id || `skill-${skillLabel}`,
            label: skillLabel,
            nodeType: 'skill',
            category: categoryMap[exerciseType] || 'other',
            source: 'mindforge',
            firstSeenAt: existingSkill?.firstSeenAt || now,
            lastSeenAt: now,
            mentionCount: (existingSkill?.mentionCount || 0) + 1,
            masteryScore: null,
        };
        nodes.push(skillNode);

        // Edge: topic → skill (practiced via this exercise)
        edges.push({
            id: `edge-${topicNode.id}-${skillNode.id}-co_occurrence`,
            sourceNodeId: topicNode.id,
            targetNodeId: skillNode.id,
            edgeType: 'co_occurrence',
            weight: Math.min(score / 100, 1),
        });

        // Analogy: create nodes for both concepts and link them
        if (exerciseType === 'analogy' && extras?.conceptA && extras?.conceptB) {
            const aLabel = extras.conceptA.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const bLabel = extras.conceptB.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            if (aLabel.length >= 3 && bLabel.length >= 3) {
                const existingA = currentNodes.find((n) => n.label === aLabel);
                const existingB = currentNodes.find((n) => n.label === bLabel);

                const nodeA: KnowledgeNode = {
                    id: existingA?.id || `concept-${aLabel}`,
                    label: aLabel,
                    nodeType: 'concept',
                    category: 'creative',
                    source: 'mindforge',
                    sourceId: `analogy-${Date.now()}`,
                    firstSeenAt: existingA?.firstSeenAt || now,
                    lastSeenAt: now,
                    mentionCount: (existingA?.mentionCount || 0) + 1,
                    masteryScore: null,
                };
                const nodeB: KnowledgeNode = {
                    id: existingB?.id || `concept-${bLabel}`,
                    label: bLabel,
                    nodeType: 'concept',
                    category: 'creative',
                    source: 'mindforge',
                    sourceId: `analogy-${Date.now()}`,
                    firstSeenAt: existingB?.firstSeenAt || now,
                    lastSeenAt: now,
                    mentionCount: (existingB?.mentionCount || 0) + 1,
                    masteryScore: null,
                };
                nodes.push(nodeA, nodeB);

                // Semantic edge between analogy concepts
                edges.push({
                    id: `edge-${nodeA.id}-${nodeB.id}-semantic`,
                    sourceNodeId: nodeA.id,
                    targetNodeId: nodeB.id,
                    edgeType: 'semantic',
                    weight: Math.min(score / 100 + 0.3, 1),
                });
            }
        }

        // Link vocab words used in MindForge exercises to the topic
        if (extras?.vocabWordsUsed?.length) {
            const allNodes = useGameStore.getState().knowledgeNodes;
            extras.vocabWordsUsed.forEach((vw) => {
                const wordNode = allNodes.find(
                    (n) => n.nodeType === 'word' && n.label === vw.toLowerCase()
                );
                if (wordNode) {
                    edges.push({
                        id: `edge-${wordNode.id}-${topicNode.id}-vocab_concept`,
                        sourceNodeId: wordNode.id,
                        targetNodeId: topicNode.id,
                        edgeType: 'vocab_concept',
                        weight: 0.7,
                    });
                }
            });
        }

        addKnowledgeNodes(nodes);
        if (edges.length > 0) addKnowledgeEdges(edges);
    }, [addKnowledgeNodes, addKnowledgeEdges]);

    return { extractAndStore, localExtract, syncVocabMastery, feedMindForgeResult };
}
