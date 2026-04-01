'use client';

import { useMemo } from 'react';
import { TrendingUp, Target, BookOpen, Calculator, Flame, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export default function SATProgressTab() {
    const scoreboard = useGameStore((s) => s.satScoreboard);
    const testResults = useGameStore((s) => s.satTestResults);
    const vocabWords = useGameStore((s) => s.vocabWords);
    const refreshSATScoreboard = useGameStore((s) => s.refreshSATScoreboard);

    const satVocab = useMemo(() => {
        refreshSATScoreboard();
        return vocabWords.filter(w => w.category === 'SAT');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vocabWords]);

    const vocabStats = useMemo(() => {
        const total = satVocab.length;
        const mastered = satVocab.filter(w => w.status === 'mastered').length;
        const learning = satVocab.filter(w => w.status === 'learning' || w.status === 'reviewing').length;
        const newWords = satVocab.filter(w => w.status === 'new').length;
        return { total, mastered, learning, new: newWords };
    }, [satVocab]);

    const recentTests = useMemo(() => testResults.slice(-10).reverse(), [testResults]);

    return (
        <div className="space-y-6">
            {/* Projected Score */}
            <div className="p-5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Projected SAT Score</p>
                <p className="text-4xl font-bold" style={{
                    color: scoreboard.projectedTotal >= 1200 ? 'var(--color-green)' : scoreboard.projectedTotal >= 800 ? 'var(--color-yellow)' : 'var(--color-text-primary)',
                }}>
                    {scoreboard.projectedTotal || '—'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">out of 1600</p>
                {scoreboard.projectedTotal > 0 && (
                    <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-hover)] max-w-xs mx-auto">
                        <div
                            className="h-full rounded-full bg-[var(--color-blue)] transition-all"
                            style={{ width: `${(scoreboard.projectedTotal / 1600) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Section Scores */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={16} className="text-[var(--color-purple)]" />
                        <p className="text-xs font-bold">Reading & Writing</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--color-purple)]">{scoreboard.avgRWScore || '—'}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">avg score (200-800)</p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Calculator size={16} className="text-[var(--color-cyan)]" />
                        <p className="text-xs font-bold">Math</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--color-cyan)]">{scoreboard.avgMathScore || '—'}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">avg score (200-800)</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<Flame size={16} className="text-[var(--color-orange)]" />} label="Streak" value={`${scoreboard.currentStreak}`} sub={`Best: ${scoreboard.longestStreak}`} />
                <StatCard icon={<Target size={16} className="text-[var(--color-green)]" />} label="Sessions" value={`${scoreboard.totalSessions}`} />
                <StatCard icon={<Trophy size={16} className="text-[var(--color-yellow)]" />} label="Tests Taken" value={`${scoreboard.totalTests}`} />
                <StatCard icon={<TrendingUp size={16} className="text-[var(--color-blue)]" />} label="SAT Vocab" value={`${vocabStats.mastered}/${vocabStats.total}`} sub="mastered" />
            </div>

            {/* Vocab Breakdown */}
            {vocabStats.total > 0 && (
                <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <p className="text-xs font-bold mb-3">SAT Vocabulary Progress</p>
                    <div className="h-3 rounded-full bg-[var(--color-bg-hover)] flex overflow-hidden">
                        {vocabStats.mastered > 0 && (
                            <div className="h-full bg-[var(--color-green)]" style={{ width: `${(vocabStats.mastered / vocabStats.total) * 100}%` }} />
                        )}
                        {vocabStats.learning > 0 && (
                            <div className="h-full bg-[var(--color-yellow)]" style={{ width: `${(vocabStats.learning / vocabStats.total) * 100}%` }} />
                        )}
                        {vocabStats.new > 0 && (
                            <div className="h-full bg-[var(--color-text-muted)]" style={{ width: `${(vocabStats.new / vocabStats.total) * 100}%` }} />
                        )}
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] text-[var(--color-text-muted)]">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-green)] mr-1" />{vocabStats.mastered} mastered</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-yellow)] mr-1" />{vocabStats.learning} learning</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-text-muted)] mr-1" />{vocabStats.new} new</span>
                    </div>
                </div>
            )}

            {/* Recent Tests */}
            {recentTests.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)]">Recent Tests</p>
                    {recentTests.map(t => (
                        <div key={t.id} className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-white">{t.section === 'full' ? 'Full Test' : t.section === 'reading-writing' ? 'R&W' : 'Math'}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">{t.date} — {t.correctAnswers}/{t.totalQuestions} correct</p>
                            </div>
                            <span className="text-lg font-bold" style={{
                                color: t.score >= 600 ? 'var(--color-green)' : t.score >= 400 ? 'var(--color-yellow)' : 'var(--color-red)',
                            }}>
                                {t.score}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {recentTests.length === 0 && vocabStats.total === 0 && (
                <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                    Start your SAT training to see progress here.
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
    return (
        <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
            {sub && <p className="text-[9px] text-[var(--color-text-muted)]">{sub}</p>}
        </div>
    );
}
