'use client';

import { useGameStore, Goal, GoalTimeframe, TaskCategory } from '@/store/useGameStore';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Plus, Trash2, CheckCircle, Circle, Flag,
  ChevronDown, ChevronUp, Trophy
} from 'lucide-react';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  week: '1 Week',
  month: '1 Month',
  quarter: '3 Months',
  year: '1 Year',
  lifetime: 'Lifetime',
};

const TIMEFRAME_COLORS: Record<GoalTimeframe, string> = {
  week: 'var(--color-green)',
  month: 'var(--color-blue)',
  quarter: 'var(--color-purple)',
  year: 'var(--color-orange)',
  lifetime: 'var(--color-yellow)',
};

const CATEGORY_EMOJIS: Record<TaskCategory, string> = {
  Study: '📚', Health: '🏃', Creative: '🎨', Work: '💼',
  Social: '🤝', Personal: '🌱', Other: '✨',
};

function getDaysLeft(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function GoalsPage() {
  const { goals, addGoal, completeGoalMilestone, completeGoal, deleteGoal, restoreGoal, updateGoalProgress } = useGameStore();
  const { addToast } = useToastStore();

  const [showAdd, setShowAdd] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('month');
  const [targetDate, setTargetDate] = useState('');
  const [milestones, setMilestones] = useState(['', '', '']);
  const [xpReward, setXpReward] = useState(200);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    addGoal(title, description, category, timeframe, targetDate, milestones, xpReward);
    addToast(`Goal "${title}" created! Go get it!`, 'success');
    setTitle('');
    setDescription('');
    setCategory('Personal');
    setTimeframe('month');
    setTargetDate('');
    setMilestones(['', '', '']);
    setXpReward(200);
    setShowAdd(false);
  };

  const handleMilestone = (goal: Goal, milestoneId: string) => {
    completeGoalMilestone(goal.id, milestoneId);
    const milestone = goal.milestones.find(m => m.id === milestoneId);
    if (!milestone?.completed) {
      addToast(`Milestone complete! Keep pushing! 💪`, 'success');
    }
  };

  const handleCompleteGoal = (goal: Goal) => {
    completeGoal(goal.id);
    triggerXPFloat(`+${goal.xpReward} XP`, '#4ade80');
    setTimeout(() => triggerXPFloat(`+${Math.ceil(goal.xpReward / 2)} 🪙`, '#fbbf24'), 200);
    addToast(`🏆 GOAL ACHIEVED: "${goal.title}"! Legendary!`, 'success');
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Flag className="text-[var(--color-orange)]" size={22} />
              Goals
            </h1>
          </div>
          <motion.button
            onClick={() => setShowAdd(v => !v)}
            className="rpg-button !py-2 !px-4 !bg-[var(--color-orange)] !text-white text-sm flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={16} />
            New Goal
          </motion.button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Stats banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rpg-card text-center !p-3">
            <p className="text-xl font-bold text-[var(--color-orange)]">{activeGoals.length}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Active Goals</p>
          </div>
          <div className="rpg-card text-center !p-3">
            <p className="text-xl font-bold text-[var(--color-green)]">{completedGoals.length}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Achieved</p>
          </div>
          <div className="rpg-card text-center !p-3">
            <p className="text-xl font-bold text-[var(--color-purple)]">
              {goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">Win Rate</p>
          </div>
        </div>

        {/* Add Goal Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              className="rpg-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h2 className="font-bold mb-4">Set a New Goal</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Read 12 books this year"
                  className="input-field"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Why does this goal matter to you? (optional)"
                  className="input-field min-h-[80px] resize-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Category</p>
                    <select value={category} onChange={e => setCategory(e.target.value as TaskCategory)} className="input-field !py-2">
                      {(['Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', 'Other'] as TaskCategory[]).map(c => (
                        <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Timeframe</p>
                    <select value={timeframe} onChange={e => setTimeframe(e.target.value as GoalTimeframe)} className="input-field !py-2">
                      {(Object.entries(TIMEFRAME_LABELS) as [GoalTimeframe, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Target Date</p>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="input-field !py-2" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">XP Reward</p>
                    <input type="number" value={xpReward} onChange={e => setXpReward(Number(e.target.value))} min={50} max={2000} step={50} className="input-field !py-2" />
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Milestones (optional)</p>
                  {milestones.map((m, i) => (
                    <input
                      key={i}
                      type="text"
                      value={m}
                      onChange={e => {
                        const newM = [...milestones];
                        newM[i] = e.target.value;
                        setMilestones(newM);
                      }}
                      placeholder={`Milestone ${i + 1}`}
                      className="input-field mb-2 text-sm"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setMilestones(prev => [...prev, ''])}
                    className="text-xs text-[var(--color-purple)] hover:underline"
                  >
                    + Add milestone
                  </button>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={!title.trim() || !targetDate}
                    className="flex-1 rpg-button !bg-[var(--color-orange)] !text-white disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Flag size={16} /> Set Goal
                  </motion.button>
                  <button type="button" onClick={() => setShowAdd(false)} className="rpg-button">Cancel</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Goals */}
        {activeGoals.length === 0 && !showAdd ? (
          <motion.div className="rpg-card text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-4xl mb-3">🏔️</p>
            <p className="font-bold text-lg">No goals yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Set ambitious goals and conquer them one step at a time.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {activeGoals.map((goal, index) => {
              const daysLeft = getDaysLeft(goal.targetDate);
              const completedMilestones = goal.milestones.filter(m => m.completed).length;
              const milestoneProgress = goal.milestones.length > 0 ? (completedMilestones / goal.milestones.length) * 100 : 0;
              const isExpanded = expandedGoal === goal.id;
              const isOverdue = daysLeft < 0;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rpg-card"
                >
                  {/* Goal header */}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{CATEGORY_EMOJIS[goal.category]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold">{goal.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                          backgroundColor: TIMEFRAME_COLORS[goal.timeframe] + '22',
                          color: TIMEFRAME_COLORS[goal.timeframe],
                        }}>
                          {TIMEFRAME_LABELS[goal.timeframe]}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{goal.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                        <span className={isOverdue ? 'text-[var(--color-red)] font-semibold' : ''}>
                          {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </span>
                        {goal.milestones.length > 0 && (
                          <span>{completedMilestones}/{goal.milestones.length} milestones</span>
                        )}
                        <span className="text-[var(--color-yellow)]">+{goal.xpReward} XP on completion</span>
                      </div>

                      {/* Progress bar — milestone-driven OR manual */}
                      {goal.milestones.length > 0 ? (
                        <div className="mt-2 h-1.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[var(--color-orange)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${milestoneProgress}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                            <span>Manual progress</span>
                            <span className="font-semibold" style={{ color: 'var(--color-orange)' }}>
                              {goal.manualProgress ?? 0}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={goal.manualProgress ?? 0}
                            onChange={e => updateGoalProgress(goal.id, Number(e.target.value))}
                            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
                            style={{ accentColor: 'var(--color-orange)' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Quick "Goal achieved!" when manual progress = 100 */}
                      {goal.milestones.length === 0 && (goal.manualProgress ?? 0) >= 100 && (
                        <motion.button
                          onClick={() => handleCompleteGoal(goal)}
                          className="px-2 py-1 text-xs font-bold rounded bg-[var(--color-green)] text-white"
                          initial={{ scale: 0.8 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }}
                          title="All done! Mark as achieved"
                        >
                          ✓ Done!
                        </motion.button>
                      )}
                      {goal.milestones.length > 0 && (
                        <button
                          onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          aria-label={isExpanded ? 'Collapse milestones' : 'Expand milestones'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleCompleteGoal(goal)}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-green)] transition-colors"
                        aria-label="Mark goal complete"
                        title="Mark goal as achieved"
                      >
                        <Trophy size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const backup = { ...goal, milestones: [...goal.milestones] };
                          deleteGoal(goal.id);
                          addToast(`Goal "${goal.title}" removed`, 'info', () => restoreGoal(backup));
                        }}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
                        aria-label="Delete goal"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Milestones expanded */}
                  <AnimatePresence>
                    {isExpanded && goal.milestones.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2">
                          {goal.milestones.map(milestone => (
                            <motion.button
                              key={milestone.id}
                              onClick={() => !milestone.completed && handleMilestone(goal, milestone.id)}
                              disabled={milestone.completed}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-dark)] transition-colors text-left"
                              whileHover={!milestone.completed ? { x: 4 } : {}}
                            >
                              {milestone.completed ? (
                                <CheckCircle size={20} className="text-[var(--color-green)] flex-shrink-0" />
                              ) : (
                                <Circle size={20} className="text-[var(--color-text-muted)] flex-shrink-0" />
                              )}
                              <span className={`text-sm ${milestone.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                                {milestone.title}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <motion.div
            className="rpg-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-[var(--color-yellow)]" />
              Achieved Goals ({completedGoals.length})
            </h2>
            <div className="space-y-2">
              {completedGoals.map(goal => (
                <div key={goal.id} className="flex items-center gap-3 py-2 opacity-70">
                  <CheckCircle size={20} className="text-[var(--color-green)] flex-shrink-0" />
                  <span className="text-sm line-through flex-1 truncate">{goal.title}</span>
                  <button
                    onClick={() => {
                      const backup = { ...goal, milestones: [...goal.milestones] };
                      deleteGoal(goal.id);
                      addToast(`Goal "${goal.title}" removed`, 'info', () => restoreGoal(backup));
                    }}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
