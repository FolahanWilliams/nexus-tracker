'use client';

import { useMemo } from 'react';
import { BookOpen, Award, TrendingUp, Calendar, Clock, Sword } from 'lucide-react';
import { useGameStore, VocabDifficulty } from '@/store/useGameStore';
import { DIFFICULTY_COLORS } from './shared';
import {
  VOCAB_MASTERY_BOSS_STEP,
  VOCAB_MASTERY_BOSS_BONUS_PER_STEP,
  VOCAB_MASTERY_BOSS_MAX_BONUS,
} from '@/lib/rewardCalculator';

// ─── Helpers ─────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function weekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function ProgressTab() {
  const { vocabWords, vocabCurrentLevel, vocabStreak } = useGameStore();

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const total = vocabWords.length;
    const mastered = vocabWords.filter(w => w.status === 'mastered').length;
    const learning = vocabWords.filter(w => w.status === 'learning').length;
    const reviewing = vocabWords.filter(w => w.status === 'reviewing').length;
    const newW = vocabWords.filter(w => w.status === 'new').length;
    const totalReviews = vocabWords.reduce((s, w) => s + w.totalReviews, 0);
    const totalCorrect = vocabWords.reduce((s, w) => s + w.correctReviews, 0);
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    const byDiff: Record<string, number> = {};
    vocabWords.forEach(w => { byDiff[w.difficulty] = (byDiff[w.difficulty] || 0) + 1; });

    const byCat: Record<string, number> = {};
    vocabWords.forEach(w => { byCat[w.category] = (byCat[w.category] || 0) + 1; });

    return { total, mastered, learning, reviewing, newW, totalReviews, totalCorrect, accuracy, byDiff, byCat };
  }, [vocabWords]);

  // ─── Mastery timeline (last 8 weeks) ───────────────────────────
  const masteryTimeline = useMemo(() => {
    const weeks: { label: string; mastered: number; added: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = daysAgo(i * 7 + 6);
      const weekEnd = daysAgo(i * 7);
      const label = weekLabel(weekStart);
      const mastered = vocabWords.filter(w =>
        w.status === 'mastered' && w.lastReviewed && w.lastReviewed >= weekStart && w.lastReviewed <= weekEnd
      ).length;
      const added = vocabWords.filter(w => w.dateAdded >= weekStart && w.dateAdded <= weekEnd).length;
      weeks.push({ label, mastered, added });
    }
    return weeks;
  }, [vocabWords]);

  const maxTimelineValue = Math.max(1, ...masteryTimeline.map(w => Math.max(w.mastered, w.added)));

  // ─── Upcoming review schedule ──────────────────────────────────
  const reviewSchedule = useMemo(() => {
    const buckets: { label: string; count: number; color: string }[] = [];
    const overdue = vocabWords.filter(w => w.nextReviewDate < today).length;
    const dueToday = vocabWords.filter(w => w.nextReviewDate === today).length;
    const tomorrow = daysFromNow(1);
    const dueTomorrow = vocabWords.filter(w => w.nextReviewDate === tomorrow).length;
    const nextWeekEnd = daysFromNow(7);
    const dueThisWeek = vocabWords.filter(w =>
      w.nextReviewDate > tomorrow && w.nextReviewDate <= nextWeekEnd
    ).length;
    const later = vocabWords.filter(w => w.nextReviewDate > nextWeekEnd).length;

    if (overdue > 0) buckets.push({ label: 'Overdue', count: overdue, color: 'var(--color-red)' });
    buckets.push({ label: 'Today', count: dueToday, color: 'var(--color-orange)' });
    buckets.push({ label: 'Tomorrow', count: dueTomorrow, color: 'var(--color-yellow)' });
    buckets.push({ label: 'This Week', count: dueThisWeek, color: 'var(--color-blue)' });
    buckets.push({ label: 'Later', count: later, color: 'var(--color-green)' });
    return buckets;
  }, [vocabWords, today]);

  // ─── Accuracy trends (recent 7 days vs older) ─────────────────
  const accuracyTrend = useMemo(() => {
    const recent7 = daysAgo(7);
    const recentWords = vocabWords.filter(w => w.lastReviewed && w.lastReviewed >= recent7 && w.totalReviews > 0);
    const olderWords = vocabWords.filter(w => w.lastReviewed && w.lastReviewed < recent7 && w.totalReviews > 0);

    const recentTotal = recentWords.reduce((s, w) => s + w.totalReviews, 0);
    const recentCorrect = recentWords.reduce((s, w) => s + w.correctReviews, 0);
    const recentAcc = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : null;

    const olderTotal = olderWords.reduce((s, w) => s + w.totalReviews, 0);
    const olderCorrect = olderWords.reduce((s, w) => s + w.correctReviews, 0);
    const olderAcc = olderTotal > 0 ? Math.round((olderCorrect / olderTotal) * 100) : null;

    return { recentAcc, olderAcc, recentCount: recentWords.length, olderCount: olderWords.length };
  }, [vocabWords]);

  // ─── Category mastery breakdown ────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { total: number; mastered: number; accuracy: number }> = {};
    vocabWords.forEach(w => {
      if (!cats[w.category]) cats[w.category] = { total: 0, mastered: 0, accuracy: 0 };
      cats[w.category].total += 1;
      if (w.status === 'mastered') cats[w.category].mastered += 1;
    });
    Object.entries(cats).forEach(([cat]) => {
      const catWords = vocabWords.filter(w => w.category === cat && w.totalReviews > 0);
      const total = catWords.reduce((s, w) => s + w.totalReviews, 0);
      const correct = catWords.reduce((s, w) => s + w.correctReviews, 0);
      cats[cat].accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    });
    return Object.entries(cats).sort(([, a], [, b]) => b.total - a.total);
  }, [vocabWords]);

  // ─── Vocab boss buff ───────────────────────────────────────────
  const bossSteps = Math.floor(stats.mastered / VOCAB_MASTERY_BOSS_STEP);
  const bossBonus = Math.min(bossSteps * VOCAB_MASTERY_BOSS_BONUS_PER_STEP, VOCAB_MASTERY_BOSS_MAX_BONUS);
  const nextBossMilestone = (bossSteps + 1) * VOCAB_MASTERY_BOSS_STEP;
  const toNextBoss = nextBossMilestone - stats.mastered;

  // ─── Weak words (lowest accuracy with 2+ reviews) ─────────────
  const weakWords = useMemo(() =>
    vocabWords
      .filter(w => w.totalReviews >= 2 && w.status !== 'mastered')
      .map(w => ({ word: w.word, accuracy: Math.round((w.correctReviews / w.totalReviews) * 100), reviews: w.totalReviews }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5),
    [vocabWords]
  );

  return (
    <div className="space-y-4">
      {/* Main stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Words" value={stats.total} icon={<BookOpen size={16} />} color="var(--color-blue)" />
        <StatCard label="Mastered" value={stats.mastered} icon={<Award size={16} />} color="var(--color-green)" />
        <StatCard label="Accuracy" value={`${stats.accuracy}%`} icon={<TrendingUp size={16} />} color="var(--color-purple)" />
        <StatCard label="Vocab Streak" value={`${vocabStreak}d`} icon={<span className="text-sm">🔥</span>} color="var(--color-orange)" />
      </div>

      {/* Boss damage buff */}
      {stats.mastered > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-red)]/20"
          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(167,139,250,0.04))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sword size={14} className="text-[var(--color-red)]" />
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold">Cross-Domain Bonus</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-[var(--color-red)]">+{Math.round(bossBonus * 100)}% Boss Damage</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {stats.mastered} word{stats.mastered !== 1 ? 's' : ''} mastered
                {bossBonus < VOCAB_MASTERY_BOSS_MAX_BONUS && <> &middot; {toNextBoss} more for next +5%</>}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full border-2 border-[var(--color-red)]/30 flex items-center justify-center">
              <span className="text-2xl">⚔️</span>
            </div>
          </div>
        </div>
      )}

      {/* Mastery timeline */}
      {stats.total > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Mastery Timeline (8 weeks)</p>
          <div className="flex items-end gap-1.5 h-24">
            {masteryTimeline.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                <div className="w-full flex flex-col gap-0.5 items-center" style={{ height: '100%', justifyContent: 'flex-end' }}>
                  {/* Mastered bar */}
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(week.mastered / maxTimelineValue * 100, week.mastered > 0 ? 8 : 0)}%`,
                      background: 'var(--color-green)',
                      minHeight: week.mastered > 0 ? '4px' : '0',
                    }}
                    title={`${week.mastered} mastered`}
                  />
                  {/* Added bar */}
                  <div
                    className="w-full rounded-b"
                    style={{
                      height: `${Math.max(week.added / maxTimelineValue * 100, week.added > 0 ? 8 : 0)}%`,
                      background: 'var(--color-blue)',
                      opacity: 0.5,
                      minHeight: week.added > 0 ? '4px' : '0',
                    }}
                    title={`${week.added} added`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-[var(--color-text-muted)]">
            <span>8w ago</span>
            <span>This week</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--color-green)]" /> Mastered</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--color-blue)] opacity-50" /> Added</span>
          </div>
        </div>
      )}

      {/* Upcoming review schedule */}
      {stats.total > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-[var(--color-blue)]" />
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold">Review Schedule</p>
          </div>
          <div className="space-y-2">
            {reviewSchedule.map(bucket => (
              <div key={bucket.label} className="flex items-center gap-3">
                <span className="text-xs w-20 text-[var(--color-text-secondary)]">{bucket.label}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-hover)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${stats.total > 0 ? Math.max((bucket.count / stats.total) * 100, bucket.count > 0 ? 3 : 0) : 0}%`,
                      background: bucket.color,
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right font-bold" style={{ color: bucket.count > 0 ? bucket.color : 'var(--color-text-muted)' }}>
                  {bucket.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accuracy trend */}
      {(accuracyTrend.recentAcc !== null || accuracyTrend.olderAcc !== null) && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-[var(--color-purple)]" />
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold">Accuracy Trend</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-bg-dark)]">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Last 7 Days</p>
              {accuracyTrend.recentAcc !== null ? (
                <>
                  <p className="text-lg font-bold" style={{ color: accuracyTrend.recentAcc >= 70 ? 'var(--color-green)' : 'var(--color-orange)' }}>
                    {accuracyTrend.recentAcc}%
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{accuracyTrend.recentCount} words reviewed</p>
                </>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] italic">No reviews yet</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-bg-dark)]">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Older</p>
              {accuracyTrend.olderAcc !== null ? (
                <>
                  <p className="text-lg font-bold" style={{ color: accuracyTrend.olderAcc >= 70 ? 'var(--color-green)' : 'var(--color-orange)' }}>
                    {accuracyTrend.olderAcc}%
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{accuracyTrend.olderCount} words reviewed</p>
                </>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] italic">No data yet</p>
              )}
            </div>
          </div>
          {accuracyTrend.recentAcc !== null && accuracyTrend.olderAcc !== null && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
              {accuracyTrend.recentAcc > accuracyTrend.olderAcc
                ? `Improving! +${accuracyTrend.recentAcc - accuracyTrend.olderAcc}% vs older reviews`
                : accuracyTrend.recentAcc < accuracyTrend.olderAcc
                  ? `Down ${accuracyTrend.olderAcc - accuracyTrend.recentAcc}% — try reviewing more frequently`
                  : 'Steady accuracy — keep it up!'
              }
            </p>
          )}
        </div>
      )}

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

      {/* Category mastery breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Category Mastery</p>
          <div className="space-y-2.5">
            {categoryBreakdown.map(([cat, data]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-secondary)] font-medium">{cat}</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span style={{ color: data.accuracy >= 70 ? 'var(--color-green)' : 'var(--color-orange)' }}>
                      {data.accuracy}% acc
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      {data.mastered}/{data.total} mastered
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 h-2">
                  <div
                    className="rounded-l h-full"
                    style={{
                      width: `${data.total > 0 ? (data.mastered / data.total) * 100 : 0}%`,
                      background: 'var(--color-green)',
                    }}
                  />
                  <div
                    className="rounded-r h-full"
                    style={{
                      width: `${data.total > 0 ? ((data.total - data.mastered) / data.total) * 100 : 100}%`,
                      background: 'var(--color-bg-hover)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak words */}
      {weakWords.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-orange)]/20">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Needs Attention</p>
          <div className="space-y-1.5">
            {weakWords.map(w => (
              <div key={w.word} className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{w.word}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)]">{w.reviews} reviews</span>
                  <span className="font-mono font-bold" style={{ color: w.accuracy < 40 ? 'var(--color-red)' : 'var(--color-orange)' }}>
                    {w.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Words with lowest accuracy that need more practice.</p>
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
