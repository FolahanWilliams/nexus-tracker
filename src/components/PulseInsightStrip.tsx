'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useNexusPulse, InsightDomain, InsightSeverity } from '@/hooks/useNexusPulse';

const severityColors: Record<InsightSeverity, string> = {
    critical: 'var(--color-red)',
    warning: 'var(--color-orange)',
    celebration: 'var(--color-green)',
    info: 'var(--color-blue)',
};

const severityBg: Record<InsightSeverity, string> = {
    critical: 'rgba(248, 113, 113, 0.08)',
    warning: 'rgba(251, 146, 60, 0.08)',
    celebration: 'rgba(74, 222, 128, 0.08)',
    info: 'rgba(96, 165, 250, 0.08)',
};

interface PulseInsightStripProps {
    domains: InsightDomain[];
    maxInsights?: number;
}

/**
 * Lightweight inline strip for page-specific pulse insights.
 * Pass the relevant domains (e.g., ['quests'] on the quests page).
 * Shows at most `maxInsights` insights (default 2) as compact banners.
 */
export default function PulseInsightStrip({ domains, maxInsights = 2 }: PulseInsightStripProps) {
    const { insights, aiSynthesis } = useNexusPulse();

    const filtered = useMemo(() => {
        return insights
            .filter(i => domains.includes(i.domain))
            .slice(0, maxInsights);
    }, [insights, domains, maxInsights]);

    // Also surface AI suggestion if it mentions domain keywords
    const aiRelevant = useMemo(() => {
        if (!aiSynthesis?.suggestion) return null;
        const lower = aiSynthesis.suggestion.toLowerCase();
        const keywords: Record<InsightDomain, string[]> = {
            quests: ['quest', 'task', 'hard', 'epic', 'complete'],
            habits: ['habit', 'streak', 'routine'],
            vocab: ['vocab', 'word', 'review', 'quiz', 'accuracy'],
            energy: ['energy', 'burnout', 'rest', 'tired'],
            focus: ['focus', 'session', 'timer'],
            streaks: ['streak', 'consecutive'],
            goals: ['goal', 'milestone'],
            'cross-domain': [],
        };
        const relevant = domains.some(d =>
            keywords[d]?.some(kw => lower.includes(kw))
        );
        return relevant ? aiSynthesis.suggestion : null;
    }, [aiSynthesis, domains]);

    if (filtered.length === 0 && !aiRelevant) return null;

    return (
        <div className="space-y-1.5 mb-4">
            <AnimatePresence initial={false}>
                {filtered.map(insight => (
                    <motion.div
                        key={insight.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
                        style={{
                            borderColor: `color-mix(in srgb, ${severityColors[insight.severity]} 30%, transparent)`,
                            background: severityBg[insight.severity],
                        }}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className="text-sm flex-shrink-0">{insight.icon}</span>
                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold" style={{ color: severityColors[insight.severity] }}>
                                {insight.title}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-secondary)] ml-1.5">
                                {insight.description}
                            </span>
                        </div>
                        {insight.actionHref && (
                            <Link
                                href={insight.actionHref}
                                className="text-[10px] font-bold text-[var(--color-purple)] hover:text-[var(--color-purple-light)] flex-shrink-0"
                            >
                                {insight.actionLabel} →
                            </Link>
                        )}
                    </motion.div>
                ))}

                {/* AI suggestion if relevant to this domain */}
                {aiRelevant && (
                    <motion.div
                        key="ai-suggestion"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--color-purple)]/20"
                        style={{ background: 'rgba(167, 139, 250, 0.06)' }}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                    >
                        <Activity size={13} className="text-[var(--color-purple)] flex-shrink-0" />
                        <p className="text-[11px] text-[var(--color-text-secondary)]">
                            <span className="font-bold text-[var(--color-purple)]">Pulse:</span> {aiRelevant}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
