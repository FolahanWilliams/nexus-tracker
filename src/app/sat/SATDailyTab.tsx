'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import SATVocabDrill from './SATVocabDrill';
import SATReadingPassage from './SATReadingPassage';
import SATWritingGrammar from './SATWritingGrammar';
import SATMathPractice from './SATMathPractice';

const BLOCKS = [
    { key: 'A' as const, label: 'SAT Vocabulary', time: '15 min', field: 'blockAComplete' as const },
    { key: 'B' as const, label: 'Reading Comprehension', time: '20 min', field: 'blockBComplete' as const },
    { key: 'C' as const, label: 'Writing & Grammar', time: '15 min', field: 'blockCComplete' as const },
    { key: 'D' as const, label: 'Math Practice', time: '20 min', field: 'blockDComplete' as const },
];

export default function SATDailyTab() {
    const session = useGameStore((s) => s.satDailySession);
    const initSATDailySession = useGameStore((s) => s.initSATDailySession);
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

    useEffect(() => {
        initSATDailySession();
    }, [initSATDailySession]);

    const toggleBlock = useCallback((key: string) => {
        setExpandedBlock(prev => prev === key ? null : key);
    }, []);

    const completedCount = session
        ? BLOCKS.filter(b => session[b.field]).length
        : 0;

    const autoAdvance = useCallback((currentKey: string) => {
        const idx = BLOCKS.findIndex(b => b.key === currentKey);
        const next = BLOCKS.slice(idx + 1).find(b => !session?.[b.field]);
        if (next) {
            setExpandedBlock(next.key);
        } else {
            setExpandedBlock(null);
        }
    }, [session]);

    if (!session) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-[var(--color-text-muted)] text-sm">Loading session...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Progress Header */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">Daily SAT Training</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                        background: completedCount === BLOCKS.length ? 'var(--color-green)' : 'var(--color-blue)',
                        color: 'white',
                    }}>
                        {completedCount}/{BLOCKS.length} Complete
                    </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-bg-hover)]">
                    <div
                        className="h-full rounded-full bg-[var(--color-blue)] transition-all duration-500"
                        style={{ width: `${(completedCount / BLOCKS.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Blocks */}
            {BLOCKS.map(block => {
                const isComplete = session[block.field];
                const isExpanded = expandedBlock === block.key;

                return (
                    <div key={block.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
                        <button
                            onClick={() => toggleBlock(block.key)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isComplete
                                    ? 'bg-[var(--color-green)] text-white'
                                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
                            }`}>
                                {isComplete ? <CheckCircle2 size={16} /> : block.key}
                            </span>
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${isComplete ? 'text-[var(--color-text-muted)] line-through' : ''}`}>
                                    {block.label}
                                </p>
                                <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                                    <Clock size={10} /> {block.time}
                                </p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
                        </button>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                                        <div className="pt-4">
                                            {block.key === 'A' && <SATVocabDrill onComplete={() => autoAdvance('A')} />}
                                            {block.key === 'B' && <SATReadingPassage onComplete={() => autoAdvance('B')} />}
                                            {block.key === 'C' && <SATWritingGrammar onComplete={() => autoAdvance('C')} />}
                                            {block.key === 'D' && <SATMathPractice onComplete={() => autoAdvance('D')} />}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}

            {completedCount === BLOCKS.length && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-lg bg-[color-mix(in_srgb,var(--color-green)_10%,transparent)] border border-[var(--color-green)] text-center"
                >
                    <p className="text-sm font-bold text-[var(--color-green)]">All blocks complete! Great SAT prep session.</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">Come back tomorrow for your next session.</p>
                </motion.div>
            )}
        </div>
    );
}
