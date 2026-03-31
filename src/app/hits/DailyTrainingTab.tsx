'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [mobileBlockIndex, setMobileBlockIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initDailySession();
    }, [initDailySession]);

    // Detect mobile
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const toggleBlock = (key: string) => {
        setExpandedBlock(expandedBlock === key ? null : key);
    };

    const goToBlock = useCallback((index: number) => {
        setMobileBlockIndex(Math.max(0, Math.min(BLOCKS.length - 1, index)));
    }, []);

    const handleBlockComplete = useCallback((nextKey: string | null) => {
        if (isMobile && nextKey) {
            const nextIndex = BLOCKS.findIndex(b => b.key === nextKey);
            if (nextIndex >= 0) setMobileBlockIndex(nextIndex);
        } else {
            setExpandedBlock(nextKey);
        }
    }, [isMobile]);

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

            {/* Mobile swipe view */}
            {isMobile ? (
                <MobileBlockView
                    session={session}
                    currentIndex={mobileBlockIndex}
                    onNavigate={goToBlock}
                    onComplete={handleBlockComplete}
                    pillar={session.pillar}
                />
            ) : (
                /* Desktop accordion view */
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
                                                <BlockContent
                                                    blockKey={block.key}
                                                    pillar={session.pillar}
                                                    onComplete={handleBlockComplete}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function BlockContent({ blockKey, pillar, onComplete }: {
    blockKey: string;
    pillar: import('@/store/types').KnowledgePillar;
    onComplete: (next: string | null) => void;
}) {
    switch (blockKey) {
        case 'A': return <ModelCardForm pillar={pillar} onComplete={() => onComplete('B')} />;
        case 'B': return <TransferDrillForm onComplete={() => onComplete('C')} />;
        case 'C': return <OutputForm onComplete={() => onComplete('D')} />;
        case 'D': return <ReflectionForm onComplete={() => onComplete('E')} />;
        case 'E': return <RecallTestForm onComplete={() => onComplete(null)} />;
        default: return null;
    }
}

// ── Mobile Swipe Block View ──────────────────────────────────────────

interface MobileBlockViewProps {
    session: NonNullable<ReturnType<typeof useGameStore.getState>['hitsDailySession']>;
    currentIndex: number;
    onNavigate: (index: number) => void;
    onComplete: (next: string | null) => void;
    pillar: import('@/store/types').KnowledgePillar;
}

function MobileBlockView({ session, currentIndex, onNavigate, onComplete, pillar }: MobileBlockViewProps) {
    const block = BLOCKS[currentIndex];
    const done = session[block.field];
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 60;
        if (info.offset.x < -threshold && currentIndex < BLOCKS.length - 1) {
            onNavigate(currentIndex + 1);
        } else if (info.offset.x > threshold && currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    };

    return (
        <div className="space-y-3">
            {/* Block selector dots */}
            <div className="flex items-center justify-center gap-1.5">
                {BLOCKS.map((b, i) => {
                    const isDone = session[b.field];
                    const isCurrent = i === currentIndex;
                    return (
                        <button
                            key={b.key}
                            onClick={() => onNavigate(i)}
                            className={`relative flex items-center justify-center transition-all duration-200 ${
                                isCurrent ? 'scale-110' : ''
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isDone
                                    ? 'bg-[var(--color-green)] text-white'
                                    : isCurrent
                                        ? 'bg-[var(--color-purple)] text-white shadow-[0_0_10px_rgba(167,139,250,0.3)]'
                                        : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                            }`}>
                                {isDone ? <CheckCircle2 size={12} /> : b.key}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Navigation arrows + block header */}
            <div className="flex items-center justify-between px-1">
                <button
                    onClick={() => onNavigate(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <p className={`text-sm font-bold ${done ? 'text-[var(--color-green)]' : 'text-[var(--color-text-primary)]'}`}>
                        Block {block.key}: {block.label}
                    </p>
                    <span className="flex items-center justify-center gap-1 text-xs text-[var(--color-text-muted)] mt-0.5">
                        <Clock size={10} /> {block.time}
                    </span>
                </div>
                <button
                    onClick={() => onNavigate(currentIndex + 1)}
                    disabled={currentIndex === BLOCKS.length - 1}
                    className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Swipeable content */}
            <div ref={containerRef} className="overflow-hidden touch-pan-y">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={block.key}
                        style={{ x, opacity }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
                    >
                        <BlockContent
                            blockKey={block.key}
                            pillar={pillar}
                            onComplete={onComplete}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Swipe hint */}
            <p className="text-center text-[10px] text-[var(--color-text-muted)]">
                Swipe left/right to navigate blocks
            </p>
        </div>
    );
}
