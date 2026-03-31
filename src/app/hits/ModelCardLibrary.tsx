'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { HITS_PILLAR_LABELS } from '@/lib/constants';
import type { KnowledgePillar, ModelCard } from '@/store/types';
import PillarBadge from './PillarBadge';

const PILLARS = Object.keys(HITS_PILLAR_LABELS) as KnowledgePillar[];

export default function ModelCardLibrary() {
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const [search, setSearch] = useState('');
    const [pillarFilter, setPillarFilter] = useState<KnowledgePillar | 'all'>('all');
    const [selectedCard, setSelectedCard] = useState<ModelCard | null>(null);

    const filtered = modelCards.filter((c) => {
        if (pillarFilter !== 'all' && c.pillar !== pillarFilter) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.definition.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Model Card Library</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{modelCards.length} models collected</p>
            </div>

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
                        onClick={() => setSelectedCard(card)}
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
