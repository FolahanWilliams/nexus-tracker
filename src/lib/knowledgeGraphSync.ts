/**
 * Knowledge Graph Supabase Sync
 *
 * Syncs knowledgeNodes and knowledgeEdges to dedicated Supabase tables
 * (knowledge_nodes, knowledge_edges) so the graph persists across devices
 * and loads instantly without re-parsing all data.
 */
import { supabase } from './supabase';
import { logger } from './logger';
import type { KnowledgeNode, KnowledgeEdge } from '@/store/types';

// ── Save knowledge nodes to Supabase ──────────────────────────────────────

export async function saveKnowledgeNodes(
    uid: string,
    nodes: KnowledgeNode[],
): Promise<boolean> {
    if (!uid || nodes.length === 0) return false;
    try {
        const rows = nodes.map((n) => ({
            id: n.id,
            user_id: uid,
            label: n.label,
            node_type: n.nodeType,
            category: n.category || 'other',
            source: n.source,
            source_id: n.sourceId || null,
            first_seen_at: n.firstSeenAt,
            last_seen_at: n.lastSeenAt,
            mention_count: n.mentionCount,
            mastery_score: n.masteryScore,
            metadata: n.metadata || {},
        }));

        const { error } = await supabase
            .from('knowledge_nodes')
            .upsert(rows, { onConflict: 'id' });

        if (error) {
            logger.error(`Knowledge nodes save failed: ${error.message}`, 'knowledgeSync');
            return false;
        }
        return true;
    } catch (err) {
        logger.error('Knowledge nodes save error', 'knowledgeSync', err);
        return false;
    }
}

// ── Save knowledge edges to Supabase ──────────────────────────────────────

export async function saveKnowledgeEdges(
    uid: string,
    edges: KnowledgeEdge[],
): Promise<boolean> {
    if (!uid || edges.length === 0) return false;
    try {
        const rows = edges.map((e) => ({
            id: e.id,
            user_id: uid,
            source_node_id: e.sourceNodeId,
            target_node_id: e.targetNodeId,
            edge_type: e.edgeType,
            weight: e.weight,
        }));

        const { error } = await supabase
            .from('knowledge_edges')
            .upsert(rows, { onConflict: 'id' });

        if (error) {
            // Ignore FK violations (node might not be synced yet)
            if (!error.message.includes('foreign key')) {
                logger.error(`Knowledge edges save failed: ${error.message}`, 'knowledgeSync');
            }
            return false;
        }
        return true;
    } catch (err) {
        logger.error('Knowledge edges save error', 'knowledgeSync', err);
        return false;
    }
}

// ── Load knowledge graph from Supabase ────────────────────────────────────

export async function loadKnowledgeGraph(uid: string): Promise<{
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
} | null> {
    if (!uid) return null;
    try {
        const [nodesRes, edgesRes] = await Promise.all([
            supabase
                .from('knowledge_nodes')
                .select('*')
                .eq('user_id', uid)
                .order('last_seen_at', { ascending: false }),
            supabase
                .from('knowledge_edges')
                .select('*')
                .eq('user_id', uid),
        ]);

        if (nodesRes.error || edgesRes.error) {
            logger.error('Knowledge graph load failed', 'knowledgeSync');
            return null;
        }

        const nodes: KnowledgeNode[] = (nodesRes.data || []).map((r) => ({
            id: r.id,
            label: r.label,
            nodeType: r.node_type as KnowledgeNode['nodeType'],
            category: r.category || 'other',
            source: r.source as KnowledgeNode['source'],
            sourceId: r.source_id || undefined,
            firstSeenAt: r.first_seen_at,
            lastSeenAt: r.last_seen_at,
            mentionCount: r.mention_count || 1,
            masteryScore: r.mastery_score,
            metadata: r.metadata || undefined,
        }));

        const edges: KnowledgeEdge[] = (edgesRes.data || []).map((r) => ({
            id: r.id,
            sourceNodeId: r.source_node_id,
            targetNodeId: r.target_node_id,
            edgeType: r.edge_type as KnowledgeEdge['edgeType'],
            weight: r.weight || 0.5,
        }));

        return { nodes, edges };
    } catch (err) {
        logger.error('Knowledge graph load error', 'knowledgeSync', err);
        return null;
    }
}

// ── Debounced sync helper ──────────────────────────────────────────────────

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 5000;

export function debouncedSyncKnowledgeGraph(
    uid: string,
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
): void {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        syncTimeout = null;
        await saveKnowledgeNodes(uid, nodes);
        await saveKnowledgeEdges(uid, edges);
        logger.info(`Synced ${nodes.length} nodes, ${edges.length} edges`, 'knowledgeSync');
    }, SYNC_DEBOUNCE_MS);
}
