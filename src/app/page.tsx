'use client';

import Link from 'next/link';
import { useGameStore, xpForLevel } from '@/store/useGameStore';
import { useState, useEffect, useMemo } from 'react';
import { Flame, Gift, Sparkles, Target, Zap, Flag, Repeat2, Timer, Trophy, TrendingUp, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/components/ToastContainer';

const DAILY_REWARDS = [
  { day: 1, gold: 50, gems: 5 },
  { day: 2, gold: 75, gems: 5 },
  { day: 3, gold: 100, gems: 10 },
  { day: 4, gold: 125, gems: 10 },
  { day: 5, gold: 150, gems: 15 },
  { day: 6, gold: 175, gems: 20 },
  { day: 7, gold: 250, gems: 50 },
];

const getRemainingMinutes = (expiresAt: string): number =>
  Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000);

function getGreeting(name: string, streak: number): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = name === 'Your Name' ? 'Hero' : name.split(' ')[0];

  if (streak >= 30) return `${timeGreeting}, ${displayName}. 30+ day streak — you're an absolute machine. 🔥`;
  if (streak >= 14) return `${timeGreeting}, ${displayName}. ${streak} day streak — unstoppable! ⚡`;
  if (streak >= 7) return `${timeGreeting}, ${displayName}. One week streak! Keep the chain alive. 💎`;
  if (streak >= 3) return `${timeGreeting}, ${displayName}. ${streak} days in a row. Don't break it! 🔥`;
  if (streak === 0) return `${timeGreeting}, ${displayName}. Today is a fresh start. Make it count.`;
  return `${timeGreeting}, ${displayName}. Let's get things done today.`;
}

function getProductivityScore(params: {
  tasksCompletedToday: number;
  habitsCompletedToday: number;
  totalHabits: number;
  streak: number;
}): number {
  const { tasksCompletedToday, habitsCompletedToday, totalHabits, streak } = params;
  let score = 0;
  score += Math.min(tasksCompletedToday * 12, 40); // up to 40 pts for tasks
  score += totalHabits > 0 ? Math.round((habitsCompletedToday / totalHabits) * 30) : 0; // up to 30 pts habits
  score += Math.min(streak * 2, 30); // up to 30 pts streak
  return Math.min(score, 100);
}

const menuItems = [
  { href: '/quests',      emoji: '📦', label: 'Quests' },
  { href: '/habits',      emoji: '🔁', label: 'Habits' },
  { href: '/focus',       emoji: '⏱️', label: 'Focus Timer' },
  { href: '/goals',       emoji: '🎯', label: 'Goals' },
  { href: '/chains',      emoji: '🗺️', label: 'Quest Chains' },
  { href: '/bosses',      emoji: '⚔️', label: 'Boss Battles' },
  { href: '/character',   emoji: '🧙', label: 'Character' },
  { href: '/inventory',   emoji: '🎒', label: 'Inventory' },
  { href: '/skills',      emoji: '🧠', label: 'Skill Tree' },
  { href: '/crafting',    emoji: '🔨', label: 'Crafting' },
  { href: '/shop',        emoji: '💎', label: 'Shop' },
  { href: '/analytics',   emoji: '📊', label: 'Analytics' },
  { href: '/achievements',emoji: '🏆', label: 'Achievements' },
  { href: '/leaderboard', emoji: '👑', label: 'Leaderboard' },
  { href: '/timeline',    emoji: '📅', label: 'Timeline' },
  { href: '/settings',    emoji: '⚙️', label: 'Settings' },
];

export default function HomePage() {
  const {
    level, xp, gold, gems, streak, title,
    characterName, characterClass,
    dailyQuests, checkDailyQuests, generateDailyQuests,
    claimDailyReward, lastDailyRewardClaim, loginStreak,
    addTask, totalQuestsCompleted, checkBuffs, activeBuffs,
    tasks, habits, goals,
  } = useGameStore();
  const { addToast } = useToastStore();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    checkDailyQuests();
    checkBuffs();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const tasksCompletedToday = useMemo(() =>
    tasks.filter(t => t.completed && t.completedAt?.startsWith(today)).length,
    [tasks, today]
  );

  const habitsCompletedToday = useMemo(() =>
    habits.filter(h => h.completedDates.includes(today)).length,
    [habits, today]
  );

  const activeGoals = useMemo(() => goals.filter(g => !g.completed), [goals]);
  const completedDailyQuests = dailyQuests.filter(q => q.completed).length;
  const canClaimDaily = lastDailyRewardClaim !== today;

  const productivityScore = getProductivityScore({
    tasksCompletedToday,
    habitsCompletedToday,
    totalHabits: habits.length,
    streak,
  });

  const xpToNext = xpForLevel(level + 1);
  const xpCurrent = xpForLevel(level);
  const xpProgress = xpToNext > xpCurrent ? ((xp - xpCurrent) / (xpToNext - xpCurrent)) * 100 : 100;

  const handleClaimDailyReward = () => {
    if (!canClaimDaily) {
      addToast('Daily reward already claimed! Come back tomorrow.', 'info');
      return;
    }
    claimDailyReward();
    const reward = DAILY_REWARDS[loginStreak % 7];
    addToast(`Daily reward claimed! +${reward.gold} Gold, +${reward.gems} Gems`, 'success');
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Generate a focused daily productivity plan with 3-5 actionable tasks',
          context: { name: characterName, characterClass, level, totalQuestsCompleted, streak }
        })
      });
      const data = await response.json();
      const questList = data.quests ?? data.tasks;
      if (questList && Array.isArray(questList)) {
        questList.forEach((task: { title?: string; difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Epic' } | string) => {
          const t = typeof task === 'string' ? task : (task.title ?? String(task));
          const diff = (typeof task === 'object' && task.difficulty) ? task.difficulty : (['Easy', 'Medium', 'Hard'] as const)[Math.floor(Math.random() * 3)];
          addTask(t, diff, undefined, 'Work');
        });
        addToast(`Generated ${questList.length} AI-powered quests!`, 'success');
      }
    } catch {
      addToast('Failed to generate plan. Try again.', 'error');
    }
    setIsGeneratingPlan(false);
  };

  const scoreColor = productivityScore >= 80 ? 'var(--color-green)' : productivityScore >= 50 ? 'var(--color-yellow)' : 'var(--color-orange)';

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Hero Banner */}
      <motion.div
        className="relative w-full h-36 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-purple)]/40 to-[var(--color-blue)]/40" />
        <div className="absolute inset-0 flex items-end px-4 py-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">War Room</p>
            <h1 className="text-lg font-bold leading-tight">{getGreeting(characterName, streak)}</h1>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 -mt-4 relative z-10">
        <div className="max-w-3xl mx-auto px-4">

          {/* Stats Card */}
          <motion.div
            className="rpg-card mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] rounded-full flex items-center justify-center text-2xl font-bold">
                  {level}
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">{title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{characterClass ?? 'No Class'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-[var(--color-yellow)]">{gold}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Gold</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[var(--color-blue)]">{gems}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Gems</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[var(--color-orange)]">{streak} 🔥</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Streak</p>
                </div>
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 text-[var(--color-text-muted)]">
                <span>XP to Level {level + 1}</span>
                <span>{xp.toLocaleString()} / {xpToNext.toLocaleString()}</span>
              </div>
              <div className="h-2.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Productivity Score + Today's Summary */}
          <motion.div
            className="grid grid-cols-2 gap-4 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Productivity Score */}
            <div className="rpg-card flex flex-col items-center justify-center py-4">
              <div className="relative w-20 h-20 mb-2">
                <svg viewBox="0 0 80 80" className="-rotate-90 w-full h-full">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                  <motion.circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - productivityScore / 100) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xl font-bold" style={{ color: scoreColor }}>{productivityScore}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-semibold">Productivity Score</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                {productivityScore >= 80 ? 'Legendary!' : productivityScore >= 50 ? 'Keep going!' : 'Just getting started'}
              </p>
            </div>

            {/* Today's Activity */}
            <div className="rpg-card space-y-3">
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Today</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Target size={14} className="text-[var(--color-green)]" />
                  <span>Quests</span>
                </div>
                <span className="font-bold text-[var(--color-green)]">{tasksCompletedToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Repeat2 size={14} className="text-[var(--color-purple)]" />
                  <span>Habits</span>
                </div>
                <span className="font-bold text-[var(--color-purple)]">{habitsCompletedToday}/{habits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Flag size={14} className="text-[var(--color-orange)]" />
                  <span>Goals</span>
                </div>
                <span className="font-bold text-[var(--color-orange)]">{activeGoals.length} active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy size={14} className="text-[var(--color-yellow)]" />
                  <span>Total</span>
                </div>
                <span className="font-bold text-[var(--color-yellow)]">{totalQuestsCompleted}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Row */}
          <motion.div
            className="grid grid-cols-4 gap-2 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {[
              { href: '/quests', icon: Target, label: 'Quests', color: 'var(--color-green)' },
              { href: '/habits', icon: Repeat2, label: 'Habits', color: 'var(--color-purple)' },
              { href: '/focus', icon: Timer, label: 'Focus', color: 'var(--color-blue)' },
              { href: '/goals', icon: Flag, label: 'Goals', color: 'var(--color-orange)' },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}>
                <motion.div
                  className="rpg-card !p-3 flex flex-col items-center gap-1.5 cursor-pointer"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={22} style={{ color }} />
                  <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{label}</p>
                </motion.div>
              </Link>
            ))}
          </motion.div>

          {/* Daily Quests + Daily Reward Row */}
          <motion.div
            className="grid grid-cols-2 gap-4 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Daily Quests */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="text-[var(--color-green)]" size={18} />
                <h3 className="font-bold text-sm">Daily Quests</h3>
                <span className="text-xs text-[var(--color-text-muted)]">({completedDailyQuests}/{dailyQuests.length})</span>
              </div>
              <div className="space-y-1.5">
                {dailyQuests.slice(0, 3).map(quest => (
                  <div key={quest.id} className="flex items-center gap-2 text-sm">
                    <span className={quest.completed ? 'text-[var(--color-green)]' : 'text-[var(--color-text-muted)]'}>
                      {quest.completed ? '✓' : '○'}
                    </span>
                    <span className={`truncate text-xs ${quest.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                      {quest.title}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/quests" className="text-xs text-[var(--color-purple)] mt-2 block">
                View all →
              </Link>
            </div>

            {/* Daily Login */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="text-[var(--color-yellow)]" size={18} />
                <h3 className="font-bold text-sm">Daily Login</h3>
              </div>
              {canClaimDaily ? (
                <motion.button
                  onClick={handleClaimDailyReward}
                  className="w-full rpg-button !bg-[var(--color-yellow)] !text-black !py-2 text-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Gift size={14} /> Claim!
                </motion.button>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">Come back tomorrow!</p>
              )}
              <div className="flex justify-center gap-1 mt-2">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <div
                    key={day}
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      day <= (loginStreak % 7) + 1
                        ? 'bg-[var(--color-yellow)] text-black'
                        : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Active Buffs */}
          <AnimatePresence>
            {activeBuffs.length > 0 && (
              <motion.div
                className="rpg-card mb-4 !border-[var(--color-green)]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
                  <Flame className="text-[var(--color-green)]" size={16} />
                  Active Buffs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeBuffs.map((buff, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-[var(--color-green)]/20 text-[var(--color-green)] rounded">
                      {buff.type} x{buff.value} ({getRemainingMinutes(buff.expiresAt)}m left)
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Plan Generator */}
          <motion.div
            className="rpg-card mb-6 !bg-gradient-to-r from-[var(--color-purple)]/20 to-[var(--color-blue)]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="text-[var(--color-purple)]" size={18} />
                  AI Quest Generator
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Generate personalized quests with Gemini AI
                </p>
              </div>
              <motion.button
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                className="rpg-button !bg-[var(--color-purple)] !text-white text-sm disabled:opacity-60"
                whileHover={!isGeneratingPlan ? { scale: 1.05 } : {}}
                whileTap={!isGeneratingPlan ? { scale: 0.95 } : {}}
              >
                {isGeneratingPlan ? (
                  <span className="flex items-center gap-1"><Zap size={14} className="animate-pulse" /> Generating...</span>
                ) : (
                  <span className="flex items-center gap-1"><Zap size={14} /> Generate</span>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Full Menu Grid */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.03 }}
              >
                <Link
                  href={item.href}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-purple)]/50 hover:bg-[var(--color-bg-hover)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
