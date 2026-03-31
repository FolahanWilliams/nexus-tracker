'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Network, Sparkles, Loader2, Briefcase } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { HITS_PILLAR_LABELS } from '@/lib/constants';
import type { KnowledgePillar, ModelCard } from '@/store/types';
import PillarBadge from './PillarBadge';

const PILLARS = Object.keys(HITS_PILLAR_LABELS) as KnowledgePillar[];

interface Connection {
    sourceId: string;
    targetId: string;
    relationship: string;
    explanation: string;
}

interface FounderInsight {
    title: string;
    insight: string;
    decision: string;
    risk: string;
    experiment: string;
    secondOrderEffects: string;
}

export default function ModelCardLibrary() {
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const addKnowledgeEdges = useGameStore((s) => s.addKnowledgeEdges);
    const knowledgeNodes = useGameStore((s) => s.knowledgeNodes);
    const [search, setSearch] = useState('');
    const [pillarFilter, setPillarFilter] = useState<KnowledgePillar | 'all'>('all');
    const [selectedCard, setSelectedCard] = useState<ModelCard | null>(null);

    // Connection detection state
    const [detectingConnections, setDetectingConnections] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [connectionError, setConnectionError] = useState('');

    // Founder insight state
    const [generatingInsight, setGeneratingInsight] = useState(false);
    const [founderInsight, setFounderInsight] = useState<FounderInsight | null>(null);
    const [startupContext, setStartupContext] = useState('');
    const [showInsightForm, setShowInsightForm] = useState(false);

    const filtered = modelCards.filter((c) => {
        if (pillarFilter !== 'all' && c.pillar !== pillarFilter) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.definition.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleDetectConnections = async () => {
        if (modelCards.length < 2) return;
        setDetectingConnections(true);
        setConnectionError('');
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

                // Add edges to knowledge graph
                const edges = data.connections.map((conn: Connection) => {
                    // Find knowledge graph node IDs for these model cards
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
            } else {
                setConnectionError('No significant connections found between your models yet.');
            }
        } catch {
            setConnectionError('AI connection detection unavailable.');
        }
        setDetectingConnections(false);
    };

    const handleGenerateInsight = async (card: ModelCard) => {
        setGeneratingInsight(true);
        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'generate_founder_insight',
                    modelCard: {
                        name: card.name,
                        definition: card.definition,
                        coreMechanism: card.coreMechanism,
                        actionRule: card.actionRule,
                        examples: card.examples,
                    },
                    startupContext: startupContext.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (data.title) {
                setFounderInsight(data);
            }
        } catch { /* silent */ }
        setGeneratingInsight(false);
    };

    const relationshipColor: Record<string, string> = {
        reinforces: 'text-[var(--color-green)]',
        contradicts: 'text-red-400',
        extends: 'text-[var(--color-blue)]',
        enables: 'text-[var(--color-purple)]',
        complements: 'text-[var(--color-yellow)]',
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Model Card Library</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{modelCards.length} models collected</p>
                </div>
                {modelCards.length >= 2 && (
                    <button
                        onClick={handleDetectConnections}
                        disabled={detectingConnections}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-purple)]/20 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/30 transition-colors disabled:opacity-40"
                    >
                        {detectingConnections ? <Loader2 size={14} className="animate-spin" /> : <Network size={14} />}
                        Detect Connections
                    </button>
                )}
            </div>

            {/* AI-detected connections */}
            {connections.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-purple)]/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Network size={14} className="text-[var(--color-purple)]" />
                        <span className="text-xs font-bold text-[var(--color-purple)]">AI-Detected Connections ({connections.length})</span>
                    </div>
                    <div className="space-y-2">
                        {connections.map((conn, i) => {
                            const source = modelCards.find(c => c.id === conn.sourceId);
                            const target = modelCards.find(c => c.id === conn.targetId);
                            return (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className={`font-bold shrink-0 uppercase text-[10px] ${relationshipColor[conn.relationship] || 'text-[var(--color-text-muted)]'}`}>
                                        {conn.relationship}
                                    </span>
                                    <span className="text-[var(--color-text-muted)]">
                                        <strong className="text-[var(--color-text-secondary)]">{source?.name || '?'}</strong>
                                        {' → '}
                                        <strong className="text-[var(--color-text-secondary)]">{target?.name || '?'}</strong>
                                        {' — '}{conn.explanation}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Connections added to your Knowledge Graph.</p>
                </div>
            )}

            {connectionError && (
                <p className="text-xs text-[var(--color-text-muted)]">{connectionError}</p>
            )}

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search models..."
                        className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                    />
                </div>
                <select
                    value={pillarFilter}
                    onChange={(e) => setPillarFilter(e.target.value as KnowledgePillar | 'all')}
                    className="bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                >
                    <option value="all">All Pillars</option>
                    {PILLARS.map(p => (
                        <option key={p} value={p}>{HITS_PILLAR_LABELS[p]}</option>
                    ))}
                </select>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((card) => (
                    <motion.button
                        key={card.id}
                        onClick={() => { setSelectedCard(card); setFounderInsight(null); setShowInsightForm(false); }}
                        className="text-left p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-purple)]/40 transition-colors"
                        whileHover={{ scale: 1.01 }}
                    >
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{card.name}</h3>
                            <PillarBadge pillar={card.pillar} size="sm" />
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{card.definition}</p>
                        <div className="flex items-center gap-3 mt-2">
                            {card.recallScore != null && (
                                <span className={`text-[10px] font-semibold ${card.recallScore >= 70 ? 'text-[var(--color-green)]' : card.recallScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    Recall: {card.recallScore}%
                                </span>
                            )}
                            <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(card.createdAt).toLocaleDateString()}</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
                    {modelCards.length === 0 ? 'No model cards yet. Complete Block A to create your first one!' : 'No models match your search.'}
                </div>
            )}

            {/* Detail Modal */}
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
                            className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{selectedCard.name}</h2>
                                    <PillarBadge pillar={selectedCard.pillar} size="sm" />
                                </div>
                                <button onClick={() => setSelectedCard(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <Section label="Definition" content={selectedCard.definition} />
                                <Section label="Core Mechanism" content={selectedCard.coreMechanism} />
                                <Section label="Example in History" content={selectedCard.examples.history} />
                                <Section label="Example in Business" content={selectedCard.examples.business} />
                                <Section label="Example in Startups" content={selectedCard.examples.startups} />
                                <Section label="Example in Your Life" content={selectedCard.examples.personal} />
                                <Section label="Limitations" content={selectedCard.limitations} />
                                <Section label="Action Rule" content={selectedCard.actionRule} />
                                <Section label="Key Question" content={selectedCard.keyQuestion} />
                            </div>

                            {selectedCard.recallScore != null && (
                                <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Last recall: <strong>{selectedCard.recallScore}%</strong>
                                        {selectedCard.lastRecalledAt && ` on ${new Date(selectedCard.lastRecalledAt).toLocaleDateString()}`}
                                    </p>
                                </div>
                            )}

                            {/* Founder Insight Generator */}
                            <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                                {!showInsightForm && !founderInsight && (
                                    <button
                                        onClick={() => setShowInsightForm(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-blue)]/20 text-[var(--color-blue)] hover:bg-[var(--color-blue)]/30 transition-colors w-full justify-center"
                                    >
                                        <Briefcase size={14} />
                                        Generate Founder Insight
                                    </button>
                                )}

                                {showInsightForm && !founderInsight && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">AI will connect this model to your startup</p>
                                        <textarea
                                            value={startupContext}
                                            onChange={(e) => setStartupContext(e.target.value)}
                                            placeholder="Describe your startup briefly (optional — e.g., 'B2B SaaS for restaurant inventory management, 50 customers, trying to hit product-market fit')"
                                            rows={2}
                                            className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-blue)]"
                                        />
                                        <button
                                            onClick={() => handleGenerateInsight(selectedCard)}
                                            disabled={generatingInsight}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-blue)]/20 text-[var(--color-blue)] hover:bg-[var(--color-blue)]/30 transition-colors disabled:opacity-40"
                                        >
                                            {generatingInsight ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            {generatingInsight ? 'Generating...' : 'Generate Decision Intelligence Doc'}
                                        </button>
                                    </div>
                                )}

                                {founderInsight && (
                                    <div className="space-y-3 mt-2">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={14} className="text-[var(--color-blue)]" />
                                            <span className="text-xs font-bold text-[var(--color-blue)]">{founderInsight.title}</span>
                                        </div>
                                        <InsightSection label="Key Insight" content={founderInsight.insight} color="var(--color-green)" />
                                        <InsightSection label="Decision" content={founderInsight.decision} color="var(--color-blue)" />
                                        <InsightSection label="Risk" content={founderInsight.risk} color="var(--color-red, red)" />
                                        <InsightSection label="Experiment" content={founderInsight.experiment} color="var(--color-purple)" />
                                        <InsightSection label="Second-Order Effects" content={founderInsight.secondOrderEffects} color="var(--color-yellow)" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Section({ label, content }: { label: string; content: string }) {
    if (!content) return null;
    return (
        <div>
            <p className="font-semibold text-[var(--color-text-secondary)] mb-0.5">{label}</p>
            <p className="text-[var(--color-text-muted)]">{content}</p>
        </div>
    );
}

function InsightSection({ label, content, color }: { label: string; content: string; color: string }) {
    if (!content) return null;
    return (
        <div className="p-2 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color }}>{label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{content}</p>
        </div>
    );
}
