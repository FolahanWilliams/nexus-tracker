'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Activity, Brain, ChevronDown, ChevronUp, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNexusPulse, InsightSeverity } from '@/hooks/useNexusPulse';

const severityStyles: Record<InsightSeverity, { border: string; bg: string; dot: string }> = {
    critical: {
        border: 'border-[var(--color-red)]/30',
        bg: 'bg-[var(--color-red)]/8',
        dot: 'bg-[var(--color-red)]',
    },
    warning: {
        border: 'border-[var(--color-orange)]/30',
        bg: 'bg-[var(--color-orange)]/8',
        dot: 'bg-[var(--color-orange)]',
    },
    celebration: {
        border: 'border-[var(--color-green)]/30',
        bg: 'bg-[var(--color-green)]/8',
        dot: 'bg-[var(--color-green)]',
    },
    info: {
        border: 'border-[var(--color-blue)]/30',
        bg: 'bg-[var(--color-blue)]/8',
        dot: 'bg-[var(--color-blue)]',
    },
};

function MomentumIcon({ momentum }: { momentum: string }) {
    switch (momentum) {
        case 'rising':
            return <TrendingUp size={14} className="text-[var(--color-green)]" />;
        case 'declining':
            return <TrendingDown size={14} className="text-[var(--color-red)]" />;
        default:
            return <Minus size={14} className="text-[var(--color-yellow)]" />;
    }
}

function BurnoutMeter({ risk }: { risk: number }) {
    const percentage = Math.round(risk * 100);
    const color = risk < 0.3 ? 'var(--color-green)' : risk < 0.6 ? 'var(--color-yellow)' : 'var(--color-red)';
    const label = risk < 0.3 ? 'Low' : risk < 0.6 ? 'Moderate' : 'High';

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
        </div>
    );
}

export default function NexusPulseCard() {
    const { insights, aiSynthesis, isLoadingAI, refreshAI, lastAIRefresh } = useNexusPulse();
    const [expanded, setExpanded] = useState(false);

    // Auto-fetch AI synthesis once per day if not cached
    useEffect(() => {
        if (!lastAIRefresh && !isLoadingAI) {
            refreshAI();
        }
    }, [lastAIRefresh, isLoadingAI, refreshAI]);

    const visibleInsights = expanded ? insights : insights.slice(0, 3);
    const hasMore = insights.length > 3;

    if (insights.length === 0 && !aiSynthesis) {
        return null; // Nothing to show — hide card entirely
    }

    return (
        <div
            className="rpg-card !p-0 overflow-hidden !border-[var(--color-purple)]/20"
            style={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.04), rgba(96, 165, 250, 0.03))' }}
        >
            {/* Header */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-md bg-[var(--color-purple)]/15 flex items-center justify-center">
                        <Activity size={13} className="text-[var(--color-purple)]" />
                        {/* Pulse dot */}
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse" />
                    </div>
                    <h3 className="text-sm font-bold">Nexus Pulse</h3>
                    <span className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Live</span>
                </div>
                <motion.button
                    onClick={refreshAI}
                    disabled={isLoadingAI}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-40"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Refresh AI synthesis"
                >
                    <RefreshCw size={13} className={`text-[var(--color-text-muted)] ${isLoadingAI ? 'animate-spin' : ''}`} />
                </motion.button>
            </div>

            {/* AI Synthesis Banner */}
            <AnimatePresence mode="wait">
                {aiSynthesis && (
                    <motion.div
                        className="mx-3 mb-2 p-3 rounded-lg bg-[var(--color-bg-dark)]/60 border border-[var(--color-border)]/50"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <div className="flex items-start gap-2 mb-2">
                            <Brain size={14} className="text-[var(--color-purple)] mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
                                {aiSynthesis.topInsight}
                            </p>
                        </div>

                        {/* Momentum + Burnout row */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="p-2 rounded-md bg-[var(--color-bg-card)]/50">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <MomentumIcon momentum={aiSynthesis.momentum} />
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Momentum</span>
                                </div>
                                <p className="text-[11px] font-semibold capitalize" style={{
                                    color: aiSynthesis.momentum === 'rising' ? 'var(--color-green)'
                                        : aiSynthesis.momentum === 'declining' ? 'var(--color-red)'
                                            : 'var(--color-yellow)'
                                }}>
                                    {aiSynthesis.momentum}
                                </p>
                            </div>
                            <div className="p-2 rounded-md bg-[var(--color-bg-card)]/50">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Burnout Risk</span>
                                <BurnoutMeter risk={aiSynthesis.burnoutRisk} />
                            </div>
                        </div>

                        {/* Suggestion */}
                        {aiSynthesis.suggestion && (
                            <div className="mt-2 p-2 rounded-md bg-[var(--color-purple)]/8 border border-[var(--color-purple)]/15">
                                <p className="text-[11px] text-[var(--color-text-secondary)]">
                                    <span className="font-bold text-[var(--color-purple)]">Suggestion:</span> {aiSynthesis.suggestion}
                                </p>
                            </div>
                        )}

                        {/* Celebration */}
                        {aiSynthesis.celebrationOpportunity && (
                            <div className="mt-2 p-2 rounded-md bg-[var(--color-green)]/8 border border-[var(--color-green)]/15">
                                <p className="text-[11px] text-[var(--color-text-secondary)]">
                                    <span className="font-bold text-[var(--color-green)]">Win:</span> {aiSynthesis.celebrationOpportunity}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading state for AI */}
            {isLoadingAI && !aiSynthesis && (
                <div className="mx-3 mb-2 p-3 rounded-lg bg-[var(--color-bg-dark)]/60 border border-[var(--color-border)]/50 flex items-center gap-2">
                    <RefreshCw size={13} className="text-[var(--color-purple)] animate-spin" />
                    <span className="text-xs text-[var(--color-text-muted)]">Analyzing your data...</span>
                </div>
            )}

            {/* Local Insights List */}
            {insights.length > 0 && (
                <div className="px-3 pb-2">
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 px-1">
                        Detected Patterns ({insights.length})
                    </p>
                    <div className="space-y-1.5">
                        <AnimatePresence initial={false}>
                            {visibleInsights.map((insight) => {
                                const styles = severityStyles[insight.severity];
                                return (
                                    <motion.div
                                        key={insight.id}
                                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${styles.border} ${styles.bg}`}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <span className="text-base flex-shrink-0 mt-0.5">{insight.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                                                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{insight.title}</p>
                                            </div>
                                            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                                                {insight.description}
                                            </p>
                                            {insight.actionHref && (
                                                <Link
                                                    href={insight.actionHref}
                                                    className="inline-block mt-1.5 text-[10px] font-bold text-[var(--color-purple)] hover:text-[var(--color-purple-light)] transition-colors"
                                                >
                                                    {insight.actionLabel || 'Take action'} →
                                                </Link>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Expand / Collapse */}
                    {hasMore && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-full mt-2 py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-purple)] transition-colors"
                        >
                            {expanded ? (
                                <>Show less <ChevronUp size={12} /></>
                            ) : (
                                <>{insights.length - 3} more insight{insights.length - 3 > 1 ? 's' : ''} <ChevronDown size={12} /></>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Empty state — AI synthesis is shown but no local insights */}
            {insights.length === 0 && aiSynthesis && (
                <div className="px-4 pb-3 text-center">
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                        No patterns detected right now — keep going!
                    </p>
                </div>
            )}
        </div>
    );
}
