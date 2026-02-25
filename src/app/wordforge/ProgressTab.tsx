'use client';

import { useMemo } from 'react';
import { BookOpen, Award, TrendingUp } from 'lucide-react';
import { useGameStore, VocabDifficulty } from '@/store/useGameStore';
import { DIFFICULTY_COLORS } from './shared';

export default function ProgressTab() {
  const { vocabWords, vocabCurrentLevel, vocabStreak } = useGameStore();

  const stats = useMemo(() => {
    const total = vocabWords.length;
    const mastered = vocabWords.filter(w => w.status === 'mastered').length;
    const learning = vocabWords.filter(w => w.status === 'learning').length;
    const reviewing = vocabWords.filter(w => w.status === 'reviewing').length;
    const newW = vocabWords.filter(w => w.status === 'new').length;
    const totalReviews = vocabWords.reduce((s, w) => s + w.totalReviews, 0);
    const totalCorrect = vocabWords.reduce((s, w) => s + w.correctReviews, 0);
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    // Words by difficulty
    const byDiff: Record<string, number> = {};
    vocabWords.forEach(w => { byDiff[w.difficulty] = (byDiff[w.difficulty] || 0) + 1; });

    // Words by category
    const byCat: Record<string, number> = {};
    vocabWords.forEach(w => { byCat[w.category] = (byCat[w.category] || 0) + 1; });

    return { total, mastered, learning, reviewing, newW, totalReviews, accuracy, byDiff, byCat };
  }, [vocabWords]);

  return (
    <div className="space-y-4">
      {/* Main stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Words" value={stats.total} icon={<BookOpen size={16} />} color="var(--color-blue)" />
        <StatCard label="Mastered" value={stats.mastered} icon={<Award size={16} />} color="var(--color-green)" />
        <StatCard label="Accuracy" value={`${stats.accuracy}%`} icon={<TrendingUp size={16} />} color="var(--color-purple)" />
        <StatCard label="Vocab Streak" value={`${vocabStreak}d`} icon={<span className="text-sm">🔥</span>} color="var(--color-orange)" />
      </div>

      {/* Current level */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">AI Difficulty Level</p>
        <div className="flex items-center gap-3">
          {(['beginner', 'intermediate', 'advanced', 'expert'] as VocabDifficulty[]).map(level => (
            <div key={level} className="flex-1 text-center">
              <div
                className="h-2 rounded-full mb-1"
                style={{
                  background: level === vocabCurrentLevel ? DIFFICULTY_COLORS[level] : 'var(--color-bg-hover)',
                  boxShadow: level === vocabCurrentLevel ? `0 0 8px ${DIFFICULTY_COLORS[level]}40` : 'none',
                }}
              />
              <p className={`text-[10px] capitalize ${level === vocabCurrentLevel ? 'text-white font-bold' : 'text-[var(--color-text-muted)]'}`}>
                {level}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--color-text-secondary)] mt-2">
          Level auto-adjusts based on your review accuracy and mastery rate.
        </p>
      </div>

      {/* Status breakdown */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Word Status Breakdown</p>
        {stats.total === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No words yet. Generate your first batch!</p>
        ) : (
          <div className="space-y-2">
            <StatusBar label="New" count={stats.newW} total={stats.total} color="var(--color-blue)" />
            <StatusBar label="Learning" count={stats.learning} total={stats.total} color="var(--color-orange)" />
            <StatusBar label="Reviewing" count={stats.reviewing} total={stats.total} color="var(--color-purple)" />
            <StatusBar label="Mastered" count={stats.mastered} total={stats.total} color="var(--color-green)" />
          </div>
        )}
      </div>

      {/* Category distribution */}
      {Object.keys(stats.byCat).length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCat).sort(([,a], [,b]) => b - a).map(([cat, count]) => (
              <span key={cat} className="text-xs px-2 py-1 rounded bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Review stats */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Review Stats</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[var(--color-text-muted)] text-xs">Total Reviews</p>
            <p className="font-bold text-white">{stats.totalReviews}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-muted)] text-xs">Overall Accuracy</p>
            <p className="font-bold" style={{ color: stats.accuracy >= 70 ? 'var(--color-green)' : 'var(--color-orange)' }}>{stats.accuracy}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 text-[var(--color-text-secondary)]">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-hover)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right text-[var(--color-text-secondary)]">{count}</span>
    </div>
  );
}
