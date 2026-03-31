'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Eye, Loader2, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { HITS_PILLAR_LABELS, HITS_PILLAR_COLORS } from '@/lib/constants';
import type { KnowledgePillar, ModelCard } from '@/store/types';
import PillarBadge from './PillarBadge';

const PILLARS = Object.keys(HITS_PILLAR_LABELS) as KnowledgePillar[];

interface Connection {
    sourceId: string;
    targetId: string;
    relationship: string;
    explanation: string;
}

export default function PillarClusterView() {
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const knowledgeEdges = useGameStore((s) => s.knowledgeEdges);
    const knowledgeNodes = useGameStore((s) => s.knowledgeNodes);
    const addKnowledgeEdges = useGameStore((s) => s.addKnowledgeEdges);
    const [selectedPillar, setSelectedPillar] = useState<KnowledgePillar | null>(null);
    const [selectedCard, setSelectedCard] = useState<ModelCard | null>(null);
    const [detectingAll, setDetectingAll] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);

    // Group cards by pillar
    const pillarGroups = useMemo(() => {
        const groups: Record<KnowledgePillar, ModelCard[]> = {} as Record<KnowledgePillar, ModelCard[]>;
        PILLARS.forEach(p => { groups[p] = []; });
        modelCards.forEach(card => {
            if (groups[card.pillar]) groups[card.pillar].push(card);
        });
        return groups;
    }, [modelCards]);

    // Find existing edges between HITS model cards
    const hitsEdges = useMemo(() => {
        const hitsNodeIds = new Set(
            knowledgeNodes.filter(n => n.source === 'hits').map(n => n.sourceId)
        );
        // Also build a map from sourceId -> nodeId
        const sourceToNode = new Map<string, string>();
        knowledgeNodes.filter(n => n.source === 'hits').forEach(n => {
            if (n.sourceId) sourceToNode.set(n.sourceId, n.id);
        });

        return knowledgeEdges.filter(e => {
            // Check if both endpoints are HITS nodes
            const sourceHits = knowledgeNodes.find(n => n.id === e.sourceNodeId && n.source === 'hits');
            const targetHits = knowledgeNodes.find(n => n.id === e.targetNodeId && n.source === 'hits');
            return sourceHits && targetHits;
        }).map(e => {
            const sourceNode = knowledgeNodes.find(n => n.id === e.sourceNodeId);
            const targetNode = knowledgeNodes.find(n => n.id === e.targetNodeId);
            return {
                sourceCardId: sourceNode?.sourceId || '',
                targetCardId: targetNode?.sourceId || '',
                edgeType: e.edgeType,
            };
        });
    }, [knowledgeEdges, knowledgeNodes]);

    // Find connections for a specific card
    const getCardConnections = (cardId: string) => {
        return hitsEdges.filter(e => e.sourceCardId === cardId || e.targetCardId === cardId);
    };

    const handleDetectAllConnections = async () => {
        if (modelCards.length < 2) return;
        setDetectingAll(true);
        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'detect_connections',
                    modelCards: modelCards.slice(0, 20).map(c => ({
                        id: c.id,
                        name: c.name,
                        definition: c.definition,
                        coreMechanism: c.coreMechanism,
                        pillar: c.pillar,
                    })),
                }),
            });
            const data = await res.json();
            if (data.connections && data.connections.length > 0) {
                setConnections(data.connections);
                const edges = data.connections.map((conn: Connection) => {
                    const sourceNode = knowledgeNodes.find(n => n.source === 'hits' && n.sourceId === conn.sourceId);
                    const targetNode = knowledgeNodes.find(n => n.source === 'hits' && n.sourceId === conn.targetId);
                    return {
                        id: crypto.randomUUID(),
                        sourceNodeId: sourceNode?.id || conn.sourceId,
                        targetNodeId: targetNode?.id || conn.targetId,
                        edgeType: conn.relationship as 'related_to',
                        weight: 0.8,
                    };
                });
                addKnowledgeEdges(edges);
            }
        } catch { /* silent */ }
        setDetectingAll(false);
    };

    // Pillar stats
    const pillarStats = PILLARS.map(p => {
        const cards = pillarGroups[p];
        const avgRecall = cards.filter(c => c.recallScore != null);
        const avg = avgRecall.length > 0 ? Math.round(avgRecall.reduce((s, c) => s + (c.recallScore ?? 0), 0) / avgRecall.length) : null;
        return { pillar: p, count: cards.length, avgRecall: avg };
    }).filter(s => s.count > 0);

    const maxCount = Math.max(...pillarStats.map(s => s.count), 1);

    const relationshipColors: Record<string, string> = {
        reinforces: '#4ade80',
        contradicts: '#f87171',
        extends: '#60a5fa',
        enables: '#a78bfa',
        complements: '#fbbf24',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        <Network size={20} className="text-[var(--color-purple)]" />
                        Pillar Cluster Map
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {modelCards.length} models across {pillarStats.length} pillars
                        {hitsEdges.length > 0 && ` · ${hitsEdges.length} connections`}
                    </p>
                </div>
                {modelCards.length >= 2 && (
                    <button
                        onClick={handleDetectAllConnections}
                        disabled={detectingAll}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-purple)]/20 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/30 transition-colors disabled:opacity-40"
                    >
                        {detectingAll ? <Loader2 size={14} className="animate-spin" /> : <Network size={14} />}
                        {detectingAll ? 'Scanning...' : 'AI Detect Connections'}
                    </button>
                )}
            </div>

            {/* Cross-pillar connections */}
            {connections.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-purple)]/30">
                    <p className="text-xs font-bold text-[var(--color-purple)] mb-2">
                        Cross-Model Connections ({connections.length})
                    </p>
                    <div className="space-y-1.5">
                        {connections.map((conn, i) => {
                            const source = modelCards.find(c => c.id === conn.sourceId);
                            const target = modelCards.find(c => c.id === conn.targetId);
                            const isCrossPillar = source && target && source.pillar !== target.pillar;
                            return (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ background: relationshipColors[conn.relationship] || '#94a3b8' }}
                                    />
                                    <span className="text-[var(--color-text-muted)]">
                                        <strong className="text-[var(--color-text-secondary)]">{source?.name}</strong>
                                        <span className="mx-1.5 text-[10px] uppercase font-bold" style={{ color: relationshipColors[conn.relationship] || '#94a3b8' }}>
                                            {conn.relationship}
                                        </span>
                                        <strong className="text-[var(--color-text-secondary)]">{target?.name}</strong>
                                        {isCrossPillar && (
                                            <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-[var(--color-purple)]/20 text-[var(--color-purple)] font-semibold">
                                                cross-pillar
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pillar Clusters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pillarStats.map(({ pillar, count, avgRecall }) => {
                    const cards = pillarGroups[pillar];
                    const color = HITS_PILLAR_COLORS[pillar];
                    const isSelected = selectedPillar === pillar;
                    const barWidth = (count / maxCount) * 100;

                    return (
                        <motion.div
                            key={pillar}
                            layout
                            onClick={() => setSelectedPillar(isSelected ? null : pillar)}
                            className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                    ? 'bg-[var(--color-bg-dark)] border-opacity-60'
                                    : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-opacity-50'
                            }`}
                            style={{ borderColor: isSelected ? color : undefined }}
                            whileHover={{ scale: 1.01 }}
                        >
                            {/* Pillar header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ background: color }}
                                    />
                                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                                        {HITS_PILLAR_LABELS[pillar]}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-bg-dark)]" style={{ color }}>
                                    {count}
                                </span>
                            </div>

                            {/* Strength bar */}
                            <div className="h-1.5 rounded-full bg-[var(--color-bg-dark)] mb-2 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barWidth}%` }}
                                    transition={{ duration: 0.6, delay: 0.1 }}
                                />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                                {avgRecall != null && (
                                    <span className={avgRecall >= 70 ? 'text-[var(--color-green)]' : avgRecall >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                                        Avg Recall: {avgRecall}%
                                    </span>
                                )}
                                <span>{cards.filter(c => c.recallScore != null).length} tested</span>
                            </div>

                            {/* Card dots preview */}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {cards.slice(0, 12).map(card => {
                                    const connCount = getCardConnections(card.id).length;
                                    return (
                                        <button
                                            key={card.id}
                                            onClick={(e) => { e.stopPropagation(); setSelectedCard(card); }}
                                            title={card.name}
                                            className="relative group"
                                        >
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-125"
                                                style={{
                                                    background: color,
                                                    opacity: card.recallScore != null ? Math.max(0.4, (card.recallScore / 100)) : 0.6,
                                                    boxShadow: connCount > 0 ? `0 0 6px ${color}` : 'none',
                                                }}
                                            >
                                                {card.name[0]}
                                            </div>
                                            {connCount > 0 && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--color-purple)] text-[7px] text-white flex items-center justify-center font-bold">
                                                    {connCount}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {cards.length > 12 && (
                                    <span className="text-[10px] text-[var(--color-text-muted)] self-center ml-1">+{cards.length - 12}</span>
                                )}
                            </div>

                            {/* Expanded card list */}
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mt-3 pt-3 border-t border-[var(--color-border)]"
                                    >
                                        <div className="space-y-1.5">
                                            {cards.map(card => (
                                                <button
                                                    key={card.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedCard(card); }}
                                                    className="w-full text-left p-2 rounded-lg hover:bg-[var(--color-bg-card)] transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{card.name}</span>
                                                        {card.recallScore != null && (
                                                            <span className={`text-[10px] font-bold ml-2 shrink-0 ${card.recallScore >= 70 ? 'text-[var(--color-green)]' : card.recallScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {card.recallScore}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">{card.definition}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Empty pillars */}
            {pillarStats.length === 0 && (
                <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
                    No model cards yet. Complete daily training to build your pillar clusters.
                </div>
            )}

            {/* Weak pillar nudge */}
            {pillarStats.length >= 3 && (
                <WeakPillarNudge pillarStats={pillarStats} />
            )}

            {/* Card detail overlay */}
            <AnimatePresence>
                {selectedCard && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedCard(null)}
                    >
                        <motion.div
                            className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] max-w-md w-full max-h-[70vh] overflow-y-auto p-5"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{selectedCard.name}</h3>
                                    <PillarBadge pillar={selectedCard.pillar} size="sm" />
                                </div>
                                <button onClick={() => setSelectedCard(null)} className="text-[var(--color-text-muted)]">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-2 text-xs">
                                <p className="text-[var(--color-text-muted)]"><strong className="text-[var(--color-text-secondary)]">Definition:</strong> {selectedCard.definition}</p>
                                <p className="text-[var(--color-text-muted)]"><strong className="text-[var(--color-text-secondary)]">Mechanism:</strong> {selectedCard.coreMechanism}</p>
                                <p className="text-[var(--color-text-muted)]"><strong className="text-[var(--color-text-secondary)]">Action Rule:</strong> {selectedCard.actionRule}</p>
                                {selectedCard.recallScore != null && (
                                    <p className="text-[var(--color-text-muted)]"><strong className="text-[var(--color-text-secondary)]">Recall:</strong> {selectedCard.recallScore}%</p>
                                )}
                            </div>
                            {/* Connected models */}
                            {getCardConnections(selectedCard.id).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                    <p className="text-[10px] font-bold text-[var(--color-purple)] uppercase tracking-wider mb-1.5">Connected Models</p>
                                    {getCardConnections(selectedCard.id).map((edge, i) => {
                                        const otherId = edge.sourceCardId === selectedCard.id ? edge.targetCardId : edge.sourceCardId;
                                        const other = modelCards.find(c => c.id === otherId);
                                        return (
                                            <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] py-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: relationshipColors[edge.edgeType] || '#94a3b8' }} />
                                                <span className="text-[10px] uppercase font-bold" style={{ color: relationshipColors[edge.edgeType] || '#94a3b8' }}>
                                                    {edge.edgeType}
                                                </span>
                                                <span className="text-[var(--color-text-secondary)] font-semibold">{other?.name || 'Unknown'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function WeakPillarNudge({ pillarStats }: { pillarStats: { pillar: KnowledgePillar; count: number; avgRecall: number | null }[] }) {
    const sorted = [...pillarStats].sort((a, b) => a.count - b.count);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    if (strongest.count - weakest.count < 2) return null;

    return (
        <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-1">
                <Eye size={14} className="text-[var(--color-yellow)]" />
                <span className="text-xs font-bold text-[var(--color-yellow)]">Pillar Imbalance</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text-secondary)]">{HITS_PILLAR_LABELS[weakest.pillar]}</strong> has only {weakest.count} card{weakest.count !== 1 ? 's' : ''} while{' '}
                <strong className="text-[var(--color-text-secondary)]">{HITS_PILLAR_LABELS[strongest.pillar]}</strong> has {strongest.count}.
                Consider focusing on {HITS_PILLAR_LABELS[weakest.pillar]} to build more balanced horizontal intelligence.
            </p>
        </div>
    );
}
