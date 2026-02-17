'use client';

import { useGameStore, Habit, TaskCategory } from '@/store/useGameStore';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, CheckCircle, Circle, Flame, Trophy, Calendar } from 'lucide-react';
import { triggerXPFloat } from '@/components/XPFloat';
import { useToastStore } from '@/components/ToastContainer';

const HABIT_ICONS = ['📚', '🏃', '💧', '🧘', '✍️', '🎯', '🌱', '🏋️', '🎨', '🧠', '💤', '🥗', '📖', '🎵', '🤝'];

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Study: 'var(--color-blue)',
  Health: 'var(--color-green)',
  Creative: 'var(--color-purple)',
  Work: 'var(--color-orange)',
  Social: 'var(--color-red)',
  Personal: 'var(--color-yellow)',
  Other: 'var(--color-text-muted)',
};

const STREAK_MILESTONES = [3, 7, 14, 30, 100];

function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '🌟';
  if (streak >= 30) return '👑';
  if (streak >= 14) return '⚡';
  if (streak >= 7) return '💎';
  if (streak >= 3) return '🔥';
  return '';
}

// Last 30 days for heatmap
function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function HabitsPage() {
  const { habits, addHabit, completeHabit, deleteHabit, checkHabitResets } = useGameStore();
  const { addToast } = useToastStore();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📚');
  const [newCategory, setNewCategory] = useState<TaskCategory>('Personal');
  const [newXP, setNewXP] = useState(15);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const last30 = useMemo(() => getLast30Days(), []);

  useEffect(() => {
    checkHabitResets();
  }, [checkHabitResets]);

  const handleComplete = (habit: Habit) => {
    if (habit.completedDates.includes(today)) return;
    completeHabit(habit.id);
    const newStreak = habit.lastCompletedDate === (() => {
      const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().split('T')[0];
    })() ? habit.streak + 1 : 1;
    triggerXPFloat(`+${habit.xpReward} XP`, '#4ade80');
    setTimeout(() => triggerXPFloat(`+${Math.ceil(habit.xpReward / 5)} 🪙`, '#fbbf24'), 200);

    if (STREAK_MILESTONES.includes(newStreak)) {
      addToast(`${getStreakEmoji(newStreak)} ${newStreak}-Day streak on "${habit.name}"!`, 'success');
    } else {
      addToast(`"${habit.name}" done! Streak: ${newStreak} day${newStreak !== 1 ? 's' : ''}`, 'success');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addHabit(newName.trim(), newIcon, newCategory, newXP);
    addToast(`Habit "${newName}" created!`, 'success');
    setNewName('');
    setNewIcon('📚');
    setNewCategory('Personal');
    setNewXP(15);
    setShowAdd(false);
  };

  const completedToday = habits.filter(h => h.completedDates.includes(today)).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const detailHabit = habits.find(h => h.id === selectedHabit);

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold">Habit Chains</h1>
          </div>
          <motion.button
            onClick={() => setShowAdd(v => !v)}
            className="rpg-button !py-2 !px-4 !bg-[var(--color-purple)] !text-white text-sm flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={16} />
            New Habit
          </motion.button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Daily Progress Banner */}
        <motion.div
          className="rpg-card !bg-gradient-to-r from-[var(--color-purple)]/20 to-[var(--color-blue)]/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Today's Progress</p>
              <p className="text-2xl font-bold">{completedToday} / {totalHabits} habits</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[var(--color-purple)]">{completionRate}%</p>
              <p className="text-xs text-[var(--color-text-muted)]">completion</p>
            </div>
          </div>
          <div className="h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--color-purple)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {completionRate === 100 && totalHabits > 0 && (
            <motion.p
              className="text-center text-sm font-bold text-[var(--color-yellow)] mt-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              🎉 ALL HABITS DONE TODAY! LEGENDARY!
            </motion.p>
          )}
        </motion.div>

        {/* Add Habit Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              className="rpg-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="font-bold mb-4">Create New Habit</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                {/* Icon picker */}
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Choose icon</p>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewIcon(icon)}
                        className={`w-9 h-9 text-lg rounded-lg border transition-all ${newIcon === icon ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/20 scale-110' : 'border-[var(--color-border)] hover:border-[var(--color-purple)]/50'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Read for 20 minutes"
                  className="input-field"
                  autoFocus
                />

                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Category</p>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as TaskCategory)}
                      className="input-field !py-2"
                    >
                      {(['Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', 'Other'] as TaskCategory[]).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">XP Reward</p>
                    <input
                      type="number"
                      value={newXP}
                      onChange={e => setNewXP(Number(e.target.value))}
                      min={5}
                      max={100}
                      step={5}
                      className="input-field !py-2 w-24"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={!newName.trim()}
                    className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus size={18} /> Create Habit
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="rpg-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Habit List */}
        {habits.length === 0 ? (
          <motion.div
            className="rpg-card text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-4xl mb-3">🌱</p>
            <p className="font-bold text-lg">No habits yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Build daily habits to forge unbreakable chains!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {habits.map((habit, index) => {
                const doneToday = habit.completedDates.includes(today);
                const streakEmoji = getStreakEmoji(habit.streak);
                const nextMilestone = STREAK_MILESTONES.find(m => m > habit.streak) ?? null;
                const progressToNext = nextMilestone ? (habit.streak / nextMilestone) * 100 : 100;

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rpg-card !p-4 ${doneToday ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Complete button */}
                      <motion.button
                        onClick={() => handleComplete(habit)}
                        disabled={doneToday}
                        className="flex-shrink-0"
                        whileHover={!doneToday ? { scale: 1.2 } : {}}
                        whileTap={!doneToday ? { scale: 0.9 } : {}}
                        aria-label={doneToday ? 'Habit completed today' : `Complete ${habit.name}`}
                      >
                        {doneToday ? (
                          <CheckCircle className="text-[var(--color-green)]" size={28} />
                        ) : (
                          <Circle className="text-[var(--color-text-muted)]" size={28} />
                        )}
                      </motion.button>

                      {/* Icon */}
                      <span className="text-2xl flex-shrink-0">{habit.icon}</span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold truncate ${doneToday ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                            {habit.name}
                          </p>
                          {streakEmoji && (
                            <span className="text-sm flex-shrink-0">{streakEmoji}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                          <span style={{ color: CATEGORY_COLORS[habit.category] }}>{habit.category}</span>
                          <span className="flex items-center gap-1">
                            <Flame size={11} className="text-[var(--color-orange)]" />
                            {habit.streak} day streak
                          </span>
                          <span>+{habit.xpReward} XP</span>
                        </div>

                        {/* Progress to next milestone */}
                        {nextMilestone && (
                          <div className="mt-1.5">
                            <div className="h-1 bg-[var(--color-bg-dark)] rounded-full overflow-hidden w-full">
                              <motion.div
                                className="h-full rounded-full bg-[var(--color-orange)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressToNext}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                              {nextMilestone - habit.streak} days to 🔥{nextMilestone}-day milestone
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <motion.button
                          onClick={() => setSelectedHabit(selectedHabit === habit.id ? null : habit.id)}
                          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-blue)] transition-colors"
                          whileHover={{ scale: 1.1 }}
                          aria-label="View habit heatmap"
                        >
                          <Calendar size={18} />
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            deleteHabit(habit.id);
                            addToast(`Habit "${habit.name}" deleted`, 'info');
                            if (selectedHabit === habit.id) setSelectedHabit(null);
                          }}
                          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
                          whileHover={{ scale: 1.1 }}
                          aria-label={`Delete ${habit.name}`}
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Heatmap / Detail Panel */}
                    <AnimatePresence>
                      {selectedHabit === habit.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <p className="text-xl font-bold text-[var(--color-orange)]">{habit.streak}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Current</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xl font-bold text-[var(--color-yellow)]">{habit.longestStreak}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Best</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xl font-bold text-[var(--color-green)]">{habit.completedDates.length}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Total Days</p>
                              </div>
                            </div>

                            {/* 30-day heatmap */}
                            <p className="text-xs text-[var(--color-text-muted)] mb-2">Last 30 days</p>
                            <div className="flex flex-wrap gap-1">
                              {last30.map(dateStr => {
                                const done = habit.completedDates.includes(dateStr);
                                const isToday = dateStr === today;
                                return (
                                  <div
                                    key={dateStr}
                                    title={dateStr}
                                    className={`w-4 h-4 rounded-sm border transition-all ${
                                      done
                                        ? 'bg-[var(--color-purple)] border-[var(--color-purple)]'
                                        : isToday
                                        ? 'border-[var(--color-purple)] bg-transparent'
                                        : 'bg-[var(--color-bg-dark)] border-[var(--color-border)]'
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {/* Milestone badges */}
                            <div className="flex gap-2 mt-4 flex-wrap">
                              {STREAK_MILESTONES.map(m => (
                                <div
                                  key={m}
                                  className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                    habit.longestStreak >= m
                                      ? 'bg-[var(--color-yellow)]/20 border-[var(--color-yellow)] text-[var(--color-yellow)]'
                                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-40'
                                  }`}
                                >
                                  {getStreakEmoji(m)} {m} days
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Overall Stats */}
        {habits.length > 0 && (
          <motion.div
            className="rpg-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-[var(--color-yellow)]" />
              Habit Hall of Fame
            </h2>
            <div className="space-y-2">
              {[...habits]
                .sort((a, b) => b.longestStreak - a.longestStreak)
                .slice(0, 5)
                .map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <span className="text-[var(--color-text-muted)] text-sm w-4">#{i + 1}</span>
                    <span className="text-lg">{h.icon}</span>
                    <span className="flex-1 text-sm font-medium truncate">{h.name}</span>
                    <span className="flex items-center gap-1 text-sm text-[var(--color-orange)] font-bold">
                      <Flame size={14} />
                      {h.longestStreak}
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
