import { useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { KnowledgeNode, KnowledgeEdge, MysteryStep } from '@/store/types';

/**
 * Hook to sync arena game results into the knowledge graph.
 * Uses getState() to avoid stale closures.
 */
export function useArenaKnowledgeSync() {
    const addKnowledgeNodes = useGameStore((s) => s.addKnowledgeNodes);
    const addKnowledgeEdges = useGameStore((s) => s.addKnowledgeEdges);

    const syncBattleResults = useCallback((wordsUsed: string[], enemyName: string) => {
        if (wordsUsed.length === 0) return;

        const now = new Date().toISOString();
        const currentNodes = useGameStore.getState().knowledgeNodes;
        const nodes: KnowledgeNode[] = [];
        const edges: KnowledgeEdge[] = [];

        // Create word nodes for each word used
        for (const word of wordsUsed) {
            const label = word.toLowerCase();
            if (label.length < 2) continue;
            const existing = currentNodes.find((n) => n.label === label && n.nodeType === 'word');
            nodes.push({
                id: existing?.id || `word-${label}`,
                label,
                nodeType: 'word',
                category: 'language',
                source: 'arena',
                sourceId: `battle-${Date.now()}`,
                firstSeenAt: existing?.firstSeenAt || now,
                lastSeenAt: now,
                mentionCount: (existing?.mentionCount || 0) + 1,
                masteryScore: null,
            });
        }

        // Create concept node for enemy
        const enemyLabel = enemyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (enemyLabel.length >= 2) {
            const existing = currentNodes.find((n) => n.label === enemyLabel);
            nodes.push({
                id: existing?.id || `concept-${enemyLabel}`,
                label: enemyLabel,
                nodeType: 'concept',
                category: 'arena-battle',
                source: 'arena',
                sourceId: `battle-${Date.now()}`,
                firstSeenAt: existing?.firstSeenAt || now,
                lastSeenAt: now,
                mentionCount: (existing?.mentionCount || 0) + 1,
                masteryScore: null,
            });
        }

        // Create co-occurrence edges between word pairs
        for (let i = 0; i < wordsUsed.length; i++) {
            for (let j = i + 1; j < wordsUsed.length; j++) {
                const aLabel = wordsUsed[i].toLowerCase();
                const bLabel = wordsUsed[j].toLowerCase();
                const aId = `word-${aLabel}`;
                const bId = `word-${bLabel}`;
                edges.push({
                    id: `edge-${aId}-${bId}-co_occurrence`,
                    sourceNodeId: aId,
                    targetNodeId: bId,
                    edgeType: 'co_occurrence',
                    weight: 0.5,
                });
            }
        }

        if (nodes.length > 0) addKnowledgeNodes(nodes);
        if (edges.length > 0) addKnowledgeEdges(edges);
    }, [addKnowledgeNodes, addKnowledgeEdges]);

    const syncGauntletResults = useCallback((puzzleAnswers: string[]) => {
        if (puzzleAnswers.length === 0) return;

        const now = new Date().toISOString();
        const currentNodes = useGameStore.getState().knowledgeNodes;
        const nodes: KnowledgeNode[] = [];
        const edges: KnowledgeEdge[] = [];

        for (const answer of puzzleAnswers) {
            const label = answer.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            if (label.length < 2) continue;
            const existing = currentNodes.find((n) => n.label === label);
            nodes.push({
                id: existing?.id || `word-${label}`,
                label,
                nodeType: 'word',
                category: 'language',
                source: 'arena',
                sourceId: `gauntlet-${Date.now()}`,
                firstSeenAt: existing?.firstSeenAt || now,
                lastSeenAt: now,
                mentionCount: (existing?.mentionCount || 0) + 1,
                masteryScore: null,
            });
        }

        // Co-occurrence edges between answers in same session
        for (let i = 0; i < puzzleAnswers.length; i++) {
            for (let j = i + 1; j < puzzleAnswers.length; j++) {
                const aLabel = puzzleAnswers[i].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                const bLabel = puzzleAnswers[j].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                if (aLabel.length < 2 || bLabel.length < 2) continue;
                edges.push({
                    id: `edge-word-${aLabel}-word-${bLabel}-co_occurrence`,
                    sourceNodeId: `word-${aLabel}`,
                    targetNodeId: `word-${bLabel}`,
                    edgeType: 'co_occurrence',
                    weight: 0.4,
                });
            }
        }

        if (nodes.length > 0) addKnowledgeNodes(nodes);
        if (edges.length > 0) addKnowledgeEdges(edges);
    }, [addKnowledgeNodes, addKnowledgeEdges]);

    const syncMysteryResults = useCallback((title: string, solvedSteps: MysteryStep[]) => {
        if (solvedSteps.length === 0) return;

        const now = new Date().toISOString();
        const currentNodes = useGameStore.getState().knowledgeNodes;
        const nodes: KnowledgeNode[] = [];
        const edges: KnowledgeEdge[] = [];

        // Concept node for mystery title
        const titleLabel = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (titleLabel.length >= 2) {
            const existing = currentNodes.find((n) => n.label === titleLabel);
            nodes.push({
                id: existing?.id || `concept-${titleLabel}`,
                label: titleLabel,
                nodeType: 'concept',
                category: 'arena-mystery',
                source: 'arena',
                sourceId: `mystery-${Date.now()}`,
                firstSeenAt: existing?.firstSeenAt || now,
                lastSeenAt: now,
                mentionCount: (existing?.mentionCount || 0) + 1,
                masteryScore: null,
            });
        }

        // Concept nodes for each step answer
        const answerNodeIds: string[] = [];
        for (const step of solvedSteps) {
            const label = step.answer.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            if (label.length < 2) continue;
            const nodeId = `concept-${label}`;
            answerNodeIds.push(nodeId);
            const existing = currentNodes.find((n) => n.label === label);
            nodes.push({
                id: existing?.id || nodeId,
                label,
                nodeType: 'concept',
                category: 'arena-mystery',
                source: 'arena',
                sourceId: `mystery-${Date.now()}`,
                firstSeenAt: existing?.firstSeenAt || now,
                lastSeenAt: now,
                mentionCount: (existing?.mentionCount || 0) + 1,
                masteryScore: null,
            });
        }

        // Semantic edges between step answers (thematically related)
        for (let i = 0; i < answerNodeIds.length; i++) {
            for (let j = i + 1; j < answerNodeIds.length; j++) {
                edges.push({
                    id: `edge-${answerNodeIds[i]}-${answerNodeIds[j]}-semantic`,
                    sourceNodeId: answerNodeIds[i],
                    targetNodeId: answerNodeIds[j],
                    edgeType: 'semantic',
                    weight: 0.6,
                });
            }
        }

        if (nodes.length > 0) addKnowledgeNodes(nodes);
        if (edges.length > 0) addKnowledgeEdges(edges);
    }, [addKnowledgeNodes, addKnowledgeEdges]);

    return { syncBattleResults, syncGauntletResults, syncMysteryResults };
}
