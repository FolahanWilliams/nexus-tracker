'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Target } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { HITS_SCOREBOARD_TARGETS } from '@/lib/constants';

const METRICS = [
    { key: 'modelCardsThisWeek' as const, label: 'Model Cards', target: HITS_SCOREBOARD_TARGETS.modelCards },
    { key: 'essaysThisWeek' as const, label: 'Essays', target: HITS_SCOREBOARD_TARGETS.essays },
    { key: 'founderDocsThisWeek' as const, label: 'Founder Memos', target: HITS_SCOREBOARD_TARGETS.founderDocs },
    { key: 'synthesisThisWeek' as const, label: 'Weekly Syntheses', target: HITS_SCOREBOARD_TARGETS.synthesis },
    { key: 'speakingRepsThisWeek' as const, label: 'Speaking Reps', target: HITS_SCOREBOARD_TARGETS.speakingReps },
    { key: 'deepWorkSprintsThisWeek' as const, label: 'Deep Work Sprints', target: HITS_SCOREBOARD_TARGETS.deepWorkSprints },
];

export default function ScoreboardTab() {
    const scoreboard = useGameStore((s) => s.hitsScoreboard);
    const refreshScoreboard = useGameStore((s) => s.refreshScoreboard);

    useEffect(() => {
        refreshScoreboard();
    }, [refreshScoreboard]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Scoreboard</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Track your intelligence like training. If you don&apos;t measure, you drift.</p>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                    <Flame size={24} className="text-orange-400" />
                    <div>
                        <p className="text-2xl font-black text-[var(--color-text-primary)]">{scoreboard.currentStreak}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Day Streak</p>
                    </div>
                </div>
                <div className="h-8 w-px bg-[var(--color-border)]" />
                <div>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{scoreboard.longestStreak}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Best Streak</p>
                </div>
                <div className="h-8 w-px bg-[var(--color-border)]" />
                <div>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{scoreboard.totalModelCards}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Total Models</p>
                </div>
            </div>

            {/* Weekly Targets */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Target size={16} className="text-[var(--color-purple)]" />
                    <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">Weekly Targets (Week of {scoreboard.weekStartDate})</h3>
                </div>

                {METRICS.map((metric) => {
                    const current = scoreboard[metric.key];
                    const pct = Math.min(100, Math.round((current / metric.target) * 100));
                    const met = current >= metric.target;

                    return (
                        <div key={metric.key} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{metric.label}</span>
                                <span className={`text-xs font-bold ${met ? 'text-[var(--color-green)]' : 'text-[var(--color-text-muted)]'}`}>
                                    {current}/{metric.target}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--color-bg-dark)] overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${met ? 'bg-[var(--color-green)]' : 'bg-[var(--color-purple)]'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rules */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2 uppercase">The Rules</h3>
                <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5">
                    <li>1. No random consumption. If it doesn&apos;t fit a pillar, it&apos;s entertainment.</li>
                    <li>2. No input without output. If you read and don&apos;t write, you&apos;re wasting time.</li>
                    <li>3. No complexity addiction. Your job is simplification, not sophistication.</li>
                    <li>4. Always apply to real life. If it doesn&apos;t change decisions, it&apos;s trivia.</li>
                </ul>
            </div>
        </div>
    );
}
