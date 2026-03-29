'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, HelpCircle, Lock, LayoutGrid, List } from 'lucide-react';
import type { MysteryStep } from '@/store/types';

interface EvidenceBoardProps {
    title: string;
    narrative: string;
    steps: MysteryStep[];
    currentStep: number;
}

export default function EvidenceBoard({ title, narrative, steps, currentStep }: EvidenceBoardProps) {
    const [view, setView] = useState<'board' | 'list'>('board');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-[var(--color-bg-card)] border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-emerald-400">{title}</h3>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setView('board')}
                            className={`p-1.5 rounded-md transition-colors ${view === 'board' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
                        >
                            <LayoutGrid size={14} />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
                        >
                            <List size={14} />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] italic">{narrative}</p>
            </div>

            {/* Clue cards */}
            {view === 'board' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnimatePresence>
                        {steps.map((step, i) => (
                            <ClueCard key={step.id} step={step} index={i} isCurrent={i === currentStep} />
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {steps.map((step, i) => (
                            <ClueCard key={step.id} step={step} index={i} isCurrent={i === currentStep} listMode />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function ClueCard({ step, index, isCurrent, listMode }: { step: MysteryStep; index: number; isCurrent: boolean; listMode?: boolean }) {
    if (step.solved) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
                className={`relative bg-[var(--color-bg-card)] border-l-4 border-l-emerald-400 border border-[var(--color-border)] rounded-xl p-4 ${listMode ? '' : ''}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        Step {index + 1}
                    </span>
                    <CheckCircle size={14} className="text-emerald-400 ml-auto" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">{step.riddle}</p>
                <p className="text-sm font-semibold text-emerald-400">{step.answer}</p>
                {step.clueRevealed && (
                    <p className="text-xs text-emerald-400/70 mt-1.5 italic border-t border-emerald-500/10 pt-1.5">
                        Clue: {step.clueRevealed}
                    </p>
                )}
            </motion.div>
        );
    }

    // Unsolved
    const isLocked = !isCurrent;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative bg-[var(--color-bg-card)] border rounded-xl p-4 ${
                isCurrent
                    ? 'border-emerald-500/40 ring-2 ring-emerald-500/20 animate-pulse'
                    : 'border-[var(--color-border)] opacity-50'
            }`}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isCurrent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]'
                }`}>
                    Step {index + 1}
                </span>
                {isLocked ? (
                    <Lock size={14} className="text-[var(--color-text-muted)] ml-auto" />
                ) : (
                    <HelpCircle size={14} className="text-emerald-400 ml-auto" />
                )}
            </div>
            {isCurrent ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{step.riddle}</p>
            ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Locked — solve previous steps first</p>
            )}
        </motion.div>
    );
}
