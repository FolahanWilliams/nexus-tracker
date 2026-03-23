'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useAuth } from '@/components/AuthProvider';
import { loadKnowledgeGraph, debouncedSyncKnowledgeGraph } from '@/lib/knowledgeGraphSync';
import { logger } from '@/lib/logger';

/**
 * Hook that syncs knowledge graph data to/from dedicated Supabase tables.
 * - On mount (if logged in): loads from Supabase and merges into store.
 * - On store changes: debounced sync to Supabase.
 */
export function useKnowledgeGraphSync() {
    const { user } = useAuth();
    const uid = user?.id || null;
    const loadedRef = useRef(false);

    // Load from Supabase on mount
    useEffect(() => {
        if (!uid || loadedRef.current) return;
        loadedRef.current = true;

        (async () => {
            try {
                const data = await loadKnowledgeGraph(uid);
                if (data && data.nodes.length > 0) {
                    const store = useGameStore.getState();
                    // Merge: keep local nodes that aren't in cloud, add cloud nodes
                    const localIds = new Set(store.knowledgeNodes.map((n) => n.id));
                    const newFromCloud = data.nodes.filter((n) => !localIds.has(n.id));
                    if (newFromCloud.length > 0) {
                        store.addKnowledgeNodes(newFromCloud);
                    }
                    const localEdgeIds = new Set(store.knowledgeEdges.map((e) => e.id));
                    const newEdgesFromCloud = data.edges.filter((e) => !localEdgeIds.has(e.id));
                    if (newEdgesFromCloud.length > 0) {
                        store.addKnowledgeEdges(newEdgesFromCloud);
                    }
                    logger.info(`Loaded ${newFromCloud.length} nodes, ${newEdgesFromCloud.length} edges from cloud`, 'knowledgeSync');
                }
            } catch (err) {
                logger.error('Failed to load knowledge graph from cloud', 'knowledgeSync', err);
            }
        })();
    }, [uid]);

    // Sync to Supabase when store changes
    const knowledgeNodes = useGameStore((s) => s.knowledgeNodes);
    const knowledgeEdges = useGameStore((s) => s.knowledgeEdges);
    const prevCountRef = useRef({ nodes: 0, edges: 0 });

    useEffect(() => {
        if (!uid) return;
        // Only sync if counts changed (avoid syncing on initial hydration)
        const prev = prevCountRef.current;
        if (knowledgeNodes.length === prev.nodes && knowledgeEdges.length === prev.edges) return;
        prevCountRef.current = { nodes: knowledgeNodes.length, edges: knowledgeEdges.length };

        debouncedSyncKnowledgeGraph(uid, knowledgeNodes, knowledgeEdges);
    }, [uid, knowledgeNodes, knowledgeEdges]);
}
