'use client';

import { useMemo } from 'react';
import { useGameStore, ActivityEntry } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

function timeAgo(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}

const TYPE_COLORS: Record<ActivityEntry['type'], string> = {
    quest_complete: 'var(--color-green)',
    habit_complete: 'var(--color-purple)',
    item_drop: 'var(--color-yellow)',
    level_up: 'var(--color-blue)',
    achievement: 'var(--color-yellow)',
    reflection: 'var(--color-blue)',
    xp_earned: 'var(--color-green)',
    boss_damage: 'var(--color-red)',
    goal_milestone: 'var(--color-orange)',
    purchase: 'var(--color-yellow)',
};

export default function RecentActivityFeed() {
    const activityLog = useGameStore(s => s.activityLog);

    // Show up to 8 most recent entries
    const entries = useMemo(() => activityLog.slice(0, 8), [activityLog]);

    if (entries.length === 0) {
        return (
            <div className="rpg-card">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-[var(--color-text-muted)]/10 flex items-center justify-center">
                        <Activity size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                    <h3 className="font-bold text-sm">Recent Activity</h3>
                </div>
                <div className="text-center py-6">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        No activity yet. Complete a quest or habit to get started!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rpg-card">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[var(--color-green)]/10 flex items-center justify-center">
                        <Activity size={14} className="text-[var(--color-green)]" />
                    </div>
                    <h3 className="font-bold text-sm">Recent Activity</h3>
                </div>
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-md bg-[var(--color-bg-dark)]">
                    {entries.length} event{entries.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--color-border)]" />

                <div className="space-y-0.5">
                    <AnimatePresence initial={false}>
                        {entries.map((entry, i) => {
                            const color = TYPE_COLORS[entry.type] || 'var(--color-text-muted)';
                            return (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03, duration: 0.25 }}
                                    className="relative flex items-start gap-2.5 py-1.5 pl-0.5 group"
                                >
                                    {/* Timeline dot */}
                                    <div
                                        className="relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] shrink-0 border-2 transition-colors"
                                        style={{
                                            background: `color-mix(in srgb, ${color} 15%, var(--color-bg-card))`,
                                            borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                                        }}
                                    >
                                        {entry.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] truncate leading-tight">
                                                {entry.text}
                                            </p>
                                            <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 font-medium tabular-nums">
                                                {timeAgo(entry.timestamp)}
                                            </span>
                                        </div>
                                        {entry.detail && (
                                            <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5 leading-tight">
                                                {entry.detail}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
