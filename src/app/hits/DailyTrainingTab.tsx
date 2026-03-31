'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import PillarBadge from './PillarBadge';
import BlockProgressBar from './BlockProgressBar';
import ModelCardForm from './ModelCardForm';
import TransferDrillForm from './TransferDrillForm';
import OutputForm from './OutputForm';
import ReflectionForm from './ReflectionForm';
import RecallTestForm from './RecallTestForm';

const BLOCKS = [
    { key: 'A' as const, label: 'Model Extraction', time: '20 min', field: 'blockAComplete' as const },
    { key: 'B' as const, label: 'Cross-Domain Translation', time: '15 min', field: 'blockBComplete' as const },
    { key: 'C' as const, label: 'Output', time: '30 min', field: 'blockCComplete' as const },
    { key: 'D' as const, label: 'Metacognition Reflection', time: '15 min', field: 'blockDComplete' as const },
    { key: 'E' as const, label: 'Active Recall Test', time: '10 min', field: 'blockEComplete' as const },
];

export default function DailyTrainingTab() {
    const session = useGameStore((s) => s.hitsDailySession);
    const initDailySession = useGameStore((s) => s.initDailySession);
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

    useEffect(() => {
        initDailySession();
    }, [initDailySession]);

    const toggleBlock = (key: string) => {
        setExpandedBlock(expandedBlock === key ? null : key);
    };

    if (!session) return null;

    const allDone = session.blockAComplete && session.blockBComplete && session.blockCComplete && session.blockDComplete && session.blockEComplete;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Daily Training</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">90 minutes to sharpen your thinking</p>
                </div>
                <PillarBadge pillar={session.pillar} />
            </div>

            <BlockProgressBar session={session} />

            {allDone && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-[var(--color-green)]/10 border border-[var(--color-green)]/30 text-center"
                >
                    <p className="text-sm font-bold text-[var(--color-green)]">Full session complete! +50 bonus XP</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">You&apos;re building horizontal intelligence. Come back tomorrow.</p>
                </motion.div>
            )}

            {/* Blocks */}
            <div className="space-y-2">
                {BLOCKS.map((block) => {
                    const done = session[block.field];
                    const isExpanded = expandedBlock === block.key;

                    return (
                        <div key={block.key} className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                            <button
                                onClick={() => toggleBlock(block.key)}
                                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                                    done
                                        ? 'bg-[var(--color-green)]/5'
                                        : 'bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-dark)]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                        done ? 'bg-[var(--color-green)] text-white' : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                                    }`}>
                                        {done ? <CheckCircle2 size={14} /> : block.key}
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-sm font-semibold ${done ? 'text-[var(--color-green)]' : 'text-[var(--color-text-primary)]'}`}>
                                            Block {block.key}: {block.label}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                                        <Clock size={12} /> {block.time}
                                    </span>
                                    {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
                                </div>
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
                                        <div className="p-4 border-t border-[var(--color-border)]">
                                            {block.key === 'A' && <ModelCardForm pillar={session.pillar} onComplete={() => setExpandedBlock('B')} />}
                                            {block.key === 'B' && <TransferDrillForm onComplete={() => setExpandedBlock('C')} />}
                                            {block.key === 'C' && <OutputForm onComplete={() => setExpandedBlock('D')} />}
                                            {block.key === 'D' && <ReflectionForm onComplete={() => setExpandedBlock('E')} />}
                                            {block.key === 'E' && <RecallTestForm onComplete={() => setExpandedBlock(null)} />}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
