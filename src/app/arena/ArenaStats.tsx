'use client';

import type { ReactNode } from 'react';
import { Swords, Zap, Search, Trophy, Flame, Target } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { DETECTIVE_RANK_THRESHOLDS } from '@/lib/arenaConstants';

export default function ArenaStats() {
    const stats = useGameStore((s) => s.arenaStats);

    const nextRank = DETECTIVE_RANK_THRESHOLDS.find((t) => t.required > stats.mysteriesSolved);
    const currentRankIdx = DETECTIVE_RANK_THRESHOLDS.findIndex((t) => t.rank === stats.detectiveRank);
    const currentThreshold = DETECTIVE_RANK_THRESHOLDS[currentRankIdx]?.required ?? 0;
    const nextThreshold = nextRank?.required ?? currentThreshold;
    const rankProgress = nextThreshold > currentThreshold
        ? ((stats.mysteriesSolved - currentThreshold) / (nextThreshold - currentThreshold)) * 100
        : 100;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <Trophy className="mx-auto text-amber-400 mb-2" size={40} />
                <h2 className="text-2xl font-bold">Arena Statistics</h2>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard icon={<Swords size={18} className="text-[var(--color-purple)]" />} label="Battles Won" value={stats.battlesWon} />
                <StatCard icon={<Swords size={18} className="text-red-400" />} label="Battles Lost" value={stats.battlesLost} />
                <StatCard icon={<Flame size={18} className="text-orange-400" />} label="Best Win Streak" value={stats.bestBattleWinStreak} />
                <StatCard icon={<Zap size={18} className="text-amber-400" />} label="Gauntlet Played" value={stats.gauntletTotalPlayed} />
                <StatCard icon={<Target size={18} className="text-amber-400" />} label="High Score" value={stats.gauntletHighScore} />
                <StatCard icon={<Search size={18} className="text-emerald-400" />} label="Mysteries Solved" value={stats.mysteriesSolved} />
            </div>

            {/* Detective rank progress */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">Detective Rank</span>
                    <span className="text-emerald-400 font-bold">{stats.detectiveRank}</span>
                </div>
                <div className="w-full h-2.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden mb-1">
                    <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${rankProgress}%` }}
                    />
                </div>
                {nextRank && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                        {stats.mysteriesSolved} / {nextRank.required} mysteries for {nextRank.rank}
                    </p>
                )}
            </div>

            {/* Totals */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-sm mb-2">Lifetime Totals</h3>
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Arena XP</span>
                    <span className="font-bold text-[var(--color-purple)]">{stats.totalArenaXpEarned}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Arena Gold</span>
                    <span className="font-bold text-amber-400">{stats.totalArenaGoldEarned}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">Current Battle Streak</span>
                    <span className="font-bold text-orange-400">{stats.battleWinStreak}</span>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        </div>
    );
}
