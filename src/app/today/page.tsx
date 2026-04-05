'use client';

/**
 * /today — the Calm Hub. Single scroll, top → bottom:
 *   1. HootDumpCard (voice/text word-dump, auto-apply + undo)
 *   2. Today's habit check-off list (inline)
 *   3. Morning intention + evening reflection launchers (DailyIntention modals)
 *   4. SlightEdgeTab (identity, micro-action, bails, armor, coach, calendar)
 *
 * Replaces the old /journal page and the global DailyIntention popup.
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sunrise, BookOpen, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import DailyIntention from '@/components/DailyIntention';
import SlightEdgeTab from '@/app/journal/SlightEdgeTab';
import HootDumpCard from '@/components/today/HootDumpCard';

export default function TodayPage() {
    const habits = useGameStore((s) => s.habits);
    const completeHabit = useGameStore((s) => s.completeHabit);
    const todayIntention = useGameStore((s) => s.todayIntention);
    const lastIntentionDate = useGameStore((s) => s.lastIntentionDate);
    const identityLine = useGameStore((s) => s.identityLine);
    const [dailyIntentionKey, setDailyIntentionKey] = useState(0);
    const [intentionMode, setIntentionMode] = useState<'morning' | 'evening' | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const hasIntentionToday = lastIntentionDate === today;
    const topHabits = [...habits]
        .sort((a, b) => (a.nextFocusDate || '').localeCompare(b.nextFocusDate || ''))
        .slice(0, 8);

    // Remount DailyIntention when user explicitly opens it — keying forces
    // a fresh mount so its force-open effect fires each click.
    const openIntention = (mode: 'morning' | 'evening') => {
        setIntentionMode(mode);
        setDailyIntentionKey((k) => k + 1);
    };

    return (
        <motion.div
            className="min-h-screen pb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                {/* Header */}
                <header className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple)]/30 to-[var(--color-blue)]/20 flex items-center justify-center">
                        <Sunrise className="text-[var(--color-yellow)]" size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold tracking-tight">Today</h1>
                        {identityLine ? (
                            <p className="text-xs text-[var(--color-text-muted)] truncate">
                                Voting today as: <span className="text-[var(--color-purple)] italic">&ldquo;{identityLine}&rdquo;</span>
                            </p>
                        ) : (
                            <p className="text-xs text-[var(--color-text-muted)]">Your one calm place to log the day.</p>
                        )}
                    </div>
                </header>

                {/* 1. Hoot dump */}
                <HootDumpCard />

                {/* 2. Morning / Evening launchers */}
                <section className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => openIntention('morning')}
                        className="rpg-card p-3 text-left hover:border-[var(--color-yellow)]/60 transition-colors group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Sunrise size={14} className="text-[var(--color-yellow)]" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Morning</p>
                        </div>
                        <p className="text-xs text-[var(--color-text-primary)]">
                            {hasIntentionToday && todayIntention
                                ? <>Intention: <span className="italic text-[var(--color-purple)]">&ldquo;{todayIntention}&rdquo;</span></>
                                : 'Set today\'s intention + micro-action'}
                        </p>
                    </button>
                    <button
                        onClick={() => openIntention('evening')}
                        className="rpg-card p-3 text-left hover:border-[var(--color-green)]/60 transition-colors group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen size={14} className="text-[var(--color-green)]" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Evening</p>
                        </div>
                        <p className="text-xs text-[var(--color-text-primary)]">
                            Log slight-edge + wanted/did reflection
                        </p>
                    </button>
                </section>

                {/* 3. Habit check-off (inline) */}
                {topHabits.length > 0 && (
                    <section className="rpg-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold tracking-wide uppercase text-[var(--color-text-primary)]">Habits</h2>
                            <Link
                                href="/habits"
                                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                            >
                                Manage <ArrowRight size={10} />
                            </Link>
                        </div>
                        <ul className="space-y-1.5">
                            {topHabits.map((h) => {
                                const done = h.completedDates.includes(today);
                                return (
                                    <li key={h.id}>
                                        <button
                                            type="button"
                                            onClick={() => !done && completeHabit(h.id)}
                                            disabled={done}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${done
                                                ? 'border-[var(--color-green)]/40 bg-[var(--color-green)]/10 opacity-80'
                                                : 'border-[var(--color-border)] bg-[var(--color-bg-dark)] hover:border-[var(--color-green)]/60'
                                                }`}
                                        >
                                            {done
                                                ? <CheckCircle2 size={16} className="text-[var(--color-green)] shrink-0" />
                                                : <Circle size={16} className="text-[var(--color-text-muted)] shrink-0" />}
                                            <span className="text-base leading-none">{h.icon}</span>
                                            <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">{h.name}</span>
                                            {h.streak > 0 && (
                                                <span className="text-[10px] font-mono text-[var(--color-orange)]">🔥 {h.streak}</span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* 4. Full Slight Edge / identity / bails / armor / coach — the
                    existing tab keeps every feature reachable without tabs. */}
                <section>
                    <SlightEdgeTab />
                </section>
            </div>

            {/* DailyIntention renders its own modals — keyed so clicking the
                Morning/Evening buttons re-mounts and force-opens the right
                modal. Without a key bump the prop change wouldn't re-trigger. */}
            {intentionMode && (
                <DailyIntention
                    key={dailyIntentionKey}
                    forceMorning={intentionMode === 'morning'}
                    forceEvening={intentionMode === 'evening'}
                />
            )}
        </motion.div>
    );
}
