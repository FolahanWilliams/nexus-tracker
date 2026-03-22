'use client';

import { useGameStore, DailyCalendarEntry } from '@/store/useGameStore';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, TrendingUp,
  BookOpen, Lightbulb, X, Save, CalendarDays, Flame,
} from 'lucide-react';
import { useToastStore } from '@/components/ToastContainer';

// ─── Slight Edge quotes ───────────────────────────────────────────
const SLIGHT_EDGE_QUOTES = [
  "Every action you take is a vote for the person you want to become.",
  "Simple daily disciplines — done consistently over time — add up to the difference between success and failure.",
  "The difference between success and failure is not dramatic. It's the slight edge.",
  "You don't need to do something extraordinary. You need to do something ordinary, consistently.",
  "1.003 raised to the power of 365 equals 2.97 — your daily 0.3% improvement more than doubles you in a year.",
  "Show up when you don't feel like it. That's the slight edge.",
  "Success is the progressive realisation of a worthy ideal — done day by day.",
  "The magic of the slight edge is that every day you either get better or worse. There is no standing still.",
  "Your philosophy creates your attitude. Your attitude creates your actions. Actions create results.",
  "Easy to do. Easy not to do. That's the slight edge.",
];

// ─── Helpers ─────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function calcStreak(entries: DailyCalendarEntry[], todayStr: string): number {
  const completedSet = new Set(entries.filter(e => e.completed).map(e => e.date));
  let streak = 0;
  const cursor = new Date(todayStr);
  while (completedSet.has(toLocalDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function calcCompoundGrowth(completedCount: number): number {
  // 1.003^n — represents 0.3% daily improvement
  return Math.pow(1.003, completedCount);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Component ───────────────────────────────────────────────────

export default function SlightEdgeCalendarPage() {
  const { dailyCalendarEntries, addOrUpdateCalendarEntry } = useGameStore();
  const { addToast } = useToastStore();

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal form state
  const [formCompleted, setFormCompleted] = useState(false);
  const [formSummary, setFormSummary] = useState('');
  const [formLearned, setFormLearned] = useState('');

  // Quote of the day (deterministic by day-of-year)
  const quoteIndex = today.getDate() % SLIGHT_EDGE_QUOTES.length;
  const quote = SLIGHT_EDGE_QUOTES[quoteIndex];

  // Derived stats
  const entryMap = useMemo(() => {
    const m: Record<string, DailyCalendarEntry> = {};
    dailyCalendarEntries.forEach(e => { m[e.date] = e; });
    return m;
  }, [dailyCalendarEntries]);

  const completedCount = dailyCalendarEntries.filter(e => e.completed).length;
  const streak = calcStreak(dailyCalendarEntries, todayStr);
  const compoundMultiplier = calcCompoundGrowth(completedCount);
  const percentGrowth = ((compoundMultiplier - 1) * 100).toFixed(1);

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function openDay(dateStr: string) {
    const existing = entryMap[dateStr];
    setFormCompleted(existing?.completed ?? false);
    setFormSummary(existing?.summary ?? '');
    setFormLearned(existing?.learned ?? '');
    setSelectedDate(dateStr);
  }

  function saveEntry() {
    if (!selectedDate) return;
    addOrUpdateCalendarEntry(selectedDate, formCompleted, formSummary, formLearned);
    if (formCompleted) {
      addToast('Day logged! Keep showing up. 🌱', 'success');
    } else {
      addToast('Entry saved. Tomorrow is a new chance.', 'info');
    }
    setSelectedDate(null);
  }

  function getDayStatus(dateStr: string): 'completed' | 'missed' | 'logged' | 'future' | 'today' {
    if (dateStr > todayStr) return 'future';
    if (dateStr === todayStr) {
      const e = entryMap[dateStr];
      if (!e) return 'today';
      return e.completed ? 'completed' : 'logged';
    }
    const e = entryMap[dateStr];
    if (!e) return 'missed';
    return e.completed ? 'completed' : 'logged';
  }

  const statusStyles: Record<string, string> = {
    completed: 'bg-[var(--color-green)]/80 text-white border-[var(--color-green)]',
    missed:    'bg-red-900/30 text-red-400 border-red-800/50',
    logged:    'bg-[var(--color-blue)]/20 text-[var(--color-blue)] border-[var(--color-blue)]/40',
    future:    'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]/30',
    today:     'bg-[var(--color-orange)]/20 text-[var(--color-orange)] border-[var(--color-orange)] ring-1 ring-[var(--color-orange)]/50',
  };

  return (
    <motion.div className="min-h-screen pb-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/goals" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="text-[var(--color-green)]" size={22} />
              Slight Edge Log
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Flame size={16} className="text-[var(--color-orange)]" />
            <span className="font-bold text-[var(--color-orange)]">{streak}</span>
            <span className="text-[var(--color-text-muted)]">day streak</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Slight Edge Philosophy Banner */}
        <motion.div
          className="rpg-card border border-[var(--color-green)]/30 bg-[var(--color-green)]/5"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🌱</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-green)] mb-1">The Slight Edge</p>
              <p className="text-sm text-[var(--color-text-secondary)] italic leading-relaxed">"{quote}"</p>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <p className="text-xl font-bold text-[var(--color-green)]">{completedCount}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Days Showed Up</p>
          </motion.div>
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <p className="text-xl font-bold text-[var(--color-orange)]">{streak}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Current Streak</p>
          </motion.div>
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <p className="text-xl font-bold text-[var(--color-purple)]">+{percentGrowth}%</p>
            <p className="text-xs text-[var(--color-text-muted)]">Compound Growth</p>
          </motion.div>
        </div>

        {/* Compound growth explanation */}
        {completedCount > 0 && (
          <motion.div
            className="rpg-card border border-[var(--color-purple)]/30 bg-[var(--color-purple)]/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-[var(--color-purple)] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  0.3% × {completedCount} days = {compoundMultiplier.toFixed(3)}× your baseline
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Showing up consistently compounds over time. At this rate, 365 days makes you ~3× better.
                </p>
              </div>
            </div>

            {/* Visual compound bar */}
            <div className="mt-3 h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-green)]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (completedCount / 365) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-right">{completedCount}/365 days toward your 1-year compound</p>
          </motion.div>
        )}

        {/* Calendar */}
        <motion.div className="rpg-card" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-base">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
            <button
              onClick={nextMonth}
              disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
              className="p-1.5 rounded hover:bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[var(--color-text-muted)] py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = getDayStatus(dateStr);
              const isFuture = status === 'future';
              const entry = entryMap[dateStr];

              return (
                <motion.button
                  key={dateStr}
                  onClick={() => !isFuture && openDay(dateStr)}
                  disabled={isFuture}
                  whileHover={!isFuture ? { scale: 1.08 } : {}}
                  whileTap={!isFuture ? { scale: 0.95 } : {}}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-all ${statusStyles[status]} ${isFuture ? 'cursor-default' : 'cursor-pointer'}`}
                  title={entry ? (entry.summary || (entry.completed ? 'Completed' : 'Logged')) : dateStr}
                >
                  <span>{day}</span>
                  {status === 'completed' && <span className="text-[8px] leading-none mt-0.5">✓</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-[var(--color-border)]">
            {[
              { color: 'bg-[var(--color-green)]/80', label: 'Completed' },
              { color: 'bg-[var(--color-orange)]/20 border border-[var(--color-orange)]', label: 'Today' },
              { color: 'bg-[var(--color-blue)]/20 border border-[var(--color-blue)]/40', label: 'Logged (no ✓)' },
              { color: 'bg-red-900/30 border border-red-800/50', label: 'Missed' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${item.color}`} />
                <span className="text-[10px] text-[var(--color-text-muted)]">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent entries */}
        {dailyCalendarEntries.length > 0 && (
          <motion.div className="rpg-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--color-blue)]" />
              Recent Journal Entries
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {[...dailyCalendarEntries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map(entry => (
                  <motion.button
                    key={entry.date}
                    onClick={() => openDay(entry.date)}
                    className="w-full text-left p-3 rounded-lg bg-[var(--color-bg-dark)] hover:bg-[var(--color-bg-hover)] transition-colors border border-[var(--color-border)] group"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {entry.completed
                        ? <CheckCircle2 size={14} className="text-[var(--color-green)] flex-shrink-0" />
                        : <Circle size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                      }
                      <span className="text-xs font-bold text-[var(--color-text-secondary)]">{entry.date}</span>
                      {entry.completed && (
                        <span className="text-[10px] text-[var(--color-green)] font-semibold ml-auto">+0.3% ✦</span>
                      )}
                    </div>
                    {entry.summary && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 pl-5">
                        <span className="font-medium text-[var(--color-text-muted)]">Did: </span>{entry.summary}
                      </p>
                    )}
                    {entry.learned && (
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 pl-5 mt-0.5">
                        <span className="font-medium">Learned: </span>{entry.learned}
                      </p>
                    )}
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Day Entry Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="font-bold text-lg">Daily Slight Edge Log</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">{selectedDate}</p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 rounded-lg hover:bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">

                {/* Did you show up? */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Did you do your goals today?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormCompleted(true)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${formCompleted
                        ? 'border-[var(--color-green)] bg-[var(--color-green)]/15 text-[var(--color-green)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-green)]/50'
                      }`}
                    >
                      <CheckCircle2 size={18} />
                      Yes, I showed up!
                    </button>
                    <button
                      onClick={() => setFormCompleted(false)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${!formCompleted
                        ? 'border-[var(--color-orange)] bg-[var(--color-orange)]/10 text-[var(--color-orange)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-orange)]/50'
                      }`}
                    >
                      <Circle size={18} />
                      Not today
                    </button>
                  </div>
                  {formCompleted && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-[var(--color-green)] mt-2 text-center font-medium"
                    >
                      🌱 Another +0.3% compounding. You're building your future self.
                    </motion.p>
                  )}
                </div>

                {/* Summary */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                    <BookOpen size={12} />
                    What did you do? (summary)
                  </label>
                  <textarea
                    value={formSummary}
                    onChange={e => setFormSummary(e.target.value)}
                    placeholder="Briefly describe what you worked on today toward your goals..."
                    className="input-field min-h-[80px] resize-none text-sm"
                    maxLength={1000}
                  />
                </div>

                {/* Learned */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                    <Lightbulb size={12} />
                    What did you learn?
                  </label>
                  <textarea
                    value={formLearned}
                    onChange={e => setFormLearned(e.target.value)}
                    placeholder="What insight, lesson, or new understanding did you gain today?"
                    className="input-field min-h-[80px] resize-none text-sm"
                    maxLength={1000}
                  />
                </div>

                {/* Slight Edge reminder */}
                <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] italic leading-relaxed">
                    💡 <strong className="text-[var(--color-text-secondary)]">Remember:</strong> The slight edge isn't about giant leaps. It's about small, consistent actions done repeatedly. Even a "bad" day where you reflect is better than silence.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={() => setSelectedDate(null)} className="flex-1 rpg-button text-sm py-2.5">
                  Cancel
                </button>
                <motion.button
                  onClick={saveEntry}
                  disabled={!formSummary.trim() && !formLearned.trim()}
                  className="flex-1 rpg-button !bg-[var(--color-green)] !text-white text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Save size={15} />
                  Save Entry
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
