'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Calendar, BookOpen, Brain, Hash, Link2 } from 'lucide-react';
import type { KnowledgeNode, KnowledgeEdge } from '@/store/useGameStore';

interface Props {
    node: KnowledgeNode | null;
    allNodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
    onClose: () => void;
    onNavigateToNode: (id: string) => void;
}

const NODE_TYPE_LABELS: Record<string, { label: string; color: string; icon: typeof BookOpen }> = {
    word: { label: 'Vocabulary Word', color: 'var(--color-green)', icon: BookOpen },
    concept: { label: 'Concept', color: 'var(--color-blue)', icon: Brain },
    skill: { label: 'Skill', color: 'var(--color-purple)', icon: TrendingUp },
};

export default function KnowledgeNodeDetail({ node, allNodes, edges, onClose, onNavigateToNode }: Props) {
    if (!node) return null;

    const config = NODE_TYPE_LABELS[node.nodeType] || NODE_TYPE_LABELS.concept;
    const Icon = config.icon;

    // Find connected nodes
    const connectedEdges = edges.filter(
        (e) => e.sourceNodeId === node.id || e.targetNodeId === node.id
    );
    const connectedNodeIds = new Set(
        connectedEdges.map((e) =>
            e.sourceNodeId === node.id ? e.targetNodeId : e.sourceNodeId
        )
    );
    const connectedNodes = allNodes.filter((n) => connectedNodeIds.has(n.id));

    const masteryPct = node.masteryScore != null ? Math.round(node.masteryScore * 100) : null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-80 lg:w-96 z-50 bg-[var(--color-bg-card)]/95 backdrop-blur-xl border-l border-[var(--color-border)] shadow-2xl overflow-y-auto"
            >
                {/* Header */}
                <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `${config.color}20` }}
                        >
                            <Icon size={16} style={{ color: config.color }} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider" style={{ color: config.color }}>
                                {config.label}
                            </p>
                            <h2 className="text-lg font-bold text-white">{node.label}</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="p-4 grid grid-cols-2 gap-3">
                    <StatCard
                        label="Category"
                        value={node.category || 'general'}
                        icon={<Hash size={14} />}
                    />
                    <StatCard
                        label="Mentions"
                        value={node.mentionCount.toString()}
                        icon={<TrendingUp size={14} />}
                    />
                    <StatCard
                        label="First Seen"
                        value={new Date(node.firstSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        icon={<Calendar size={14} />}
                    />
                    <StatCard
                        label="Last Seen"
                        value={new Date(node.lastSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        icon={<Calendar size={14} />}
                    />
                </div>

                {/* Mastery Bar (words only) */}
                {masteryPct != null && (
                    <div className="px-4 pb-4">
                        <div className="bg-[var(--color-bg-dark)] rounded-lg p-3 border border-[var(--color-border)]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-[var(--color-text-secondary)]">Mastery</span>
                                <span className="text-sm font-mono text-white">{masteryPct}%</span>
                            </div>
                            <div className="h-2 bg-[var(--color-bg-hover)] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${masteryPct}%` }}
                                    className="h-full rounded-full"
                                    style={{
                                        background: masteryPct > 80
                                            ? 'var(--color-green)'
                                            : masteryPct > 40
                                                ? 'var(--color-yellow)'
                                                : 'var(--color-red, #ef4444)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Connected Nodes */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Link2 size={14} className="text-[var(--color-text-secondary)]" />
                        <h3 className="text-sm font-semibold text-white">
                            Connected ({connectedNodes.length})
                        </h3>
                    </div>
                    {connectedNodes.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-muted)] italic">No connections yet</p>
                    ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {connectedNodes.map((cn) => {
                                const cnConfig = NODE_TYPE_LABELS[cn.nodeType] || NODE_TYPE_LABELS.concept;
                                const edge = connectedEdges.find(
                                    (e) =>
                                        (e.sourceNodeId === cn.id && e.targetNodeId === node.id) ||
                                        (e.targetNodeId === cn.id && e.sourceNodeId === node.id)
                                );
                                return (
                                    <button
                                        key={cn.id}
                                        onClick={() => onNavigateToNode(cn.id)}
                                        className="w-full flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-dark)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] transition-colors text-left"
                                    >
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ background: cnConfig.color }}
                                        />
                                        <span className="text-sm text-white truncate flex-1">
                                            {cn.label}
                                        </span>
                                        {edge && (
                                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono flex-shrink-0">
                                                {edge.edgeType.replace('_', ' ')}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Source */}
                <div className="px-4 pb-6">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Source</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        {node.source.replace('_', ' ')}
                        {node.sourceId ? ` • ${node.sourceId}` : ''}
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="bg-[var(--color-bg-dark)] rounded-lg p-3 border border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 mb-1 text-[var(--color-text-muted)]">
                {icon}
                <span className="text-[10px] uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-semibold text-white capitalize">{value}</p>
        </div>
    );
}
