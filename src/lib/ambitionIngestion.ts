/**
 * Pure library function for ingesting a "wanted"/"did" text pair into the
 * knowledge graph and writing the resulting gap analysis back onto the daily
 * calendar entry.
 *
 * Extracted from `src/hooks/useAmbitionIngestion.ts` so it can be called
 * outside of React contexts (e.g. from HootActionExecutor).
 */

import { useGameStore } from '@/store/useGameStore';
import type {
    KnowledgeNode,
    KnowledgeEdge,
    KnowledgeNodeType,
    KnowledgeEdgeType,
    GapAnalysis,
} from '@/store/useGameStore';

interface ExtractedEntity {
    label: string;
    display?: string;
    type: string;
    inWanted: boolean;
    inDid: boolean;
    action: string;
}

interface ExtractAndDiffResponse {
    entities?: ExtractedEntity[];
    honored?: string[];
    missed?: string[];
    gapScore?: number;
}

const ALLOWED_NODE_TYPES: Set<KnowledgeNodeType> = new Set([
    'person',
    'organization',
    'accelerator',
    'book',
    'target',
]);

const ACTION_TO_EDGE: Record<string, KnowledgeEdgeType> = {
    contacted: 'contacted',
    wanted_to_contact: 'wanted_to_contact',
    read: 'read',
    wanted_to_read: 'wanted_to_read',
    mentioned: 'mentioned',
};

/**
 * Extract entities from a wanted/did pair, store them in the knowledge graph,
 * and write the gap analysis back onto the daily calendar entry.
 */
export async function ingestWantedDid(
    date: string,
    wanted: string,
    did: string,
): Promise<GapAnalysis | null> {
    if (!wanted.trim() && !did.trim()) return null;

    const store = useGameStore.getState();
    const { addKnowledgeNodes, addKnowledgeEdges, updateDailyWantedDid } = store;

    try {
        const res = await fetch('/api/akrasia-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'extract_and_diff', wanted, did }),
        });
        const data: ExtractAndDiffResponse = await res.json();
        if (!data.entities || data.entities.length === 0) {
            updateDailyWantedDid(date, wanted, did);
            return null;
        }

        const now = new Date().toISOString();
        const currentNodes = useGameStore.getState().knowledgeNodes;
        const newNodes: KnowledgeNode[] = [];
        const entityToNodeId = new Map<string, string>();
        const keyFor = (type: string, label: string) => `${type}|${label.toLowerCase().trim()}`;

        for (const ent of data.entities) {
            const type = ent.type as KnowledgeNodeType;
            if (!ALLOWED_NODE_TYPES.has(type)) continue;
            const label = ent.label.toLowerCase().trim();
            if (!label) continue;

            const existing = currentNodes.find((n) => n.label === label && n.nodeType === type);
            const nodeId = existing?.id || `${type}-${label}`;
            entityToNodeId.set(keyFor(type, label), nodeId);

            newNodes.push({
                id: nodeId,
                label,
                nodeType: type,
                category: 'personal',
                source: 'gap_capture',
                sourceId: date,
                firstSeenAt: existing?.firstSeenAt || now,
                lastSeenAt: now,
                mentionCount: (existing?.mentionCount || 0) + 1,
                masteryScore: null,
                metadata: {
                    display: ent.display || label,
                    lastAction: ent.action,
                    lastSeenDate: date,
                },
            });
        }

        if (newNodes.length > 0) {
            addKnowledgeNodes(newNodes);
        }

        const edges: KnowledgeEdge[] = [];
        const entities = data.entities.filter((e) => entityToNodeId.has(keyFor(e.type, e.label)));
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            const aId = entityToNodeId.get(keyFor(a.type, a.label))!;
            for (let j = i + 1; j < entities.length; j++) {
                const b = entities[j];
                const bId = entityToNodeId.get(keyFor(b.type, b.label))!;
                if (aId === bId) continue;
                edges.push({
                    id: `edge-${aId}-${bId}-co_occurrence`,
                    sourceNodeId: aId,
                    targetNodeId: bId,
                    edgeType: 'co_occurrence',
                    weight: 0.4,
                });
            }

            const edgeType = ACTION_TO_EDGE[a.action];
            if (edgeType) {
                const anchorLabel = `status-${edgeType}`;
                const anchorId = `target-${anchorLabel}`;
                const existingAnchor = useGameStore
                    .getState()
                    .knowledgeNodes.find((n) => n.id === anchorId);
                if (!existingAnchor) {
                    addKnowledgeNodes([
                        {
                            id: anchorId,
                            label: anchorLabel,
                            nodeType: 'target',
                            category: 'coach-anchor',
                            source: 'coach',
                            firstSeenAt: now,
                            lastSeenAt: now,
                            mentionCount: 1,
                            masteryScore: null,
                            metadata: { anchor: true, edgeType },
                        },
                    ]);
                }
                edges.push({
                    id: `edge-${aId}-${anchorId}-${edgeType}`,
                    sourceNodeId: aId,
                    targetNodeId: anchorId,
                    edgeType,
                    weight: 1,
                });
            }
        }

        if (edges.length > 0) {
            addKnowledgeEdges(edges);
        }

        const idForBareLabel = (label: string): string => {
            const l = label.toLowerCase().trim();
            for (const [k, v] of entityToNodeId.entries()) {
                if (k.endsWith(`|${l}`)) return v;
            }
            return label;
        };
        const gap: GapAnalysis = {
            wantedEntities: entities.filter((e) => e.inWanted).map((e) => entityToNodeId.get(keyFor(e.type, e.label))!).filter(Boolean),
            didEntities: entities.filter((e) => e.inDid).map((e) => entityToNodeId.get(keyFor(e.type, e.label))!).filter(Boolean),
            missed: (data.missed ?? []).map(idForBareLabel),
            honored: (data.honored ?? []).map(idForBareLabel),
            gapScore: typeof data.gapScore === 'number' ? Math.max(0, Math.min(1, data.gapScore)) : 0,
            analyzedAt: now,
        };
        updateDailyWantedDid(date, wanted, did, gap);
        return gap;
    } catch {
        updateDailyWantedDid(date, wanted, did);
        return null;
    }
}
