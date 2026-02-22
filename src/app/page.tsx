'use client';

import Link from 'next/link';
import { useGameStore, xpForLevel } from '@/store/useGameStore';
import { useState, useEffect, useMemo } from 'react';
import { Flame, Gift, Sparkles, Target, Zap, Flag, Repeat2, Timer, Trophy, ChevronRight, Sword, User, Backpack, BarChart3, Settings, Map, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/components/ToastContainer';
import WeeklyPlanner from '@/components/WeeklyPlanner';

import { useAuth } from '@/components/AuthProvider';
import LoginScreen from '@/components/LoginScreen';

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

  if (streak >= 30) return `${timeGreeting}, ${displayName}. 30+ day streak — you&apos;re an absolute machine. 🔥`;
  if (streak >= 14) return `${timeGreeting}, ${displayName}. ${streak} day streak — unstoppable! ⚡`;
  if (streak >= 7) return `${timeGreeting}, ${displayName}. One week streak! Keep the chain alive. 💎`;
  if (streak >= 3) return `${timeGreeting}, ${displayName}. ${streak} days in a row. Don&apos;t break it! 🔥`;
  if (streak === 0) return `${timeGreeting}, ${displayName}. Today is a fresh start. Make it count.`;
  return `${timeGreeting}, ${displayName}. Let&apos;s get things done today.`;
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
  { href: '/quests', icon: Target, label: 'Quests', color: 'var(--color-green)' },
  { href: '/habits', icon: Repeat2, label: 'Habits', color: 'var(--color-purple)' },
  { href: '/focus', icon: Timer, label: 'Focus Timer', color: 'var(--color-blue)' },
  { href: '/goals', icon: Flag, label: 'Goals', color: 'var(--color-orange)' },
  { href: '/reflection', icon: BookOpen, label: 'Daily Check-In', color: 'var(--color-yellow)' },
  { href: '/chains', icon: Map, label: 'Quest Chains', color: 'var(--color-blue)' },
  { href: '/bosses', icon: Sword, label: 'Boss Battles', color: 'var(--color-red)' },
  { href: '/character', icon: User, label: 'Character & Skills', color: 'var(--color-purple-light)' },
  { href: '/inventory', icon: Backpack, label: 'Items & Shop', color: 'var(--color-yellow)' },
  { href: '/analytics', icon: BarChart3, label: 'Progress & Records', color: 'var(--color-green)' },
  { href: '/settings', icon: Settings, label: 'Settings', color: 'var(--color-text-muted)' },
];

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-4xl animate-pulse">✨</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const {
    level, xp, gold, gems, streak, title,
    characterName, characterClass,
    dailyQuests, checkDailyQuests, generateDailyQuests, toggleDailyQuest,
    claimDailyReward, lastDailyRewardClaim, loginStreak,
    addTask, totalQuestsCompleted, checkBuffs, activeBuffs,
    tasks, habits, goals, reflectionNotes, todayEnergyRating,
    completeHabit, streakFreezes, lastFreezedDate,
    comebackBonusAmount, clearComebackBonus
  } = useGameStore();
  const { addToast } = useToastStore();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Show comeback bonus toast when the player returns after a broken streak
  useEffect(() => {
    if (comebackBonusAmount) {
      addToast(`Welcome back! Comeback bonus: +${comebackBonusAmount} XP for returning! 💪`, 'success');
      clearComebackBonus();
    }
  }, [comebackBonusAmount]);

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
    const reward = DAILY_REWARDS[loginStreak % 7];
    claimDailyReward();
    addToast(`Daily reward claimed! +${reward.gold} Gold, +${reward.gems} Gems`, 'success');
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Generate a focused daily productivity plan with 1-2 actionable tasks',
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
  const scoreGlow = productivityScore >= 80 ? 'rgba(74, 222, 128, 0.3)' : productivityScore >= 50 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 146, 60, 0.3)';

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Banner */}
      <motion.div
        className="relative w-full h-44 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-purple)]/30 via-[var(--color-blue)]/20 to-[var(--color-bg-dark)] animate-gradient" style={{ backgroundSize: '200% 200%' }} />
        {/* Decorative orbs */}
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-[var(--color-purple)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-4 w-24 h-24 rounded-full bg-[var(--color-blue)]/10 blur-2xl" />
        <div className="absolute inset-0 flex items-end px-4 py-5">
          <div className="max-w-3xl lg:max-w-5xl mx-auto w-full">
            <motion.p
              className="text-[10px] text-[var(--color-purple-light)] uppercase tracking-[0.2em] font-bold mb-1.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              War Room
            </motion.p>
            <motion.h1
              className="text-lg font-bold leading-tight"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {getGreeting(characterName, streak)}
            </motion.h1>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="flex-1 -mt-6 relative z-10"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <div className="max-w-3xl lg:max-w-5xl mx-auto px-4 lg:px-8">

          {/* Stats Card */}
          <motion.div
            className="rpg-card mb-4 shimmer glow-purple"
            variants={fadeUp}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="relative w-14 h-14"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] opacity-40 blur-md" />
                  <div className="relative w-full h-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] rounded-full flex items-center justify-center text-2xl font-black ring-2 ring-[var(--color-purple)]/30 ring-offset-2 ring-offset-[var(--color-bg-card)]">
                    {level}
                  </div>
                </motion.div>
                <div>
                  <p className="font-bold text-lg leading-tight">{title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{characterClass ?? 'No Class'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { value: gold, label: 'Gold', color: 'var(--color-yellow)', bg: 'rgba(251, 191, 36, 0.1)' },
                  { value: gems, label: 'Gems', color: 'var(--color-blue)', bg: 'rgba(96, 165, 250, 0.1)' },
                ].map(stat => (
                  <div key={stat.label} className="text-center px-2.5 py-1.5 rounded-lg" style={{ background: stat.bg }}>
                    <p className="text-base font-bold" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: stat.color, opacity: 0.7 }}>{stat.label}</p>
                  </div>
                ))}
                <div className="text-center px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
                  <p className="text-base font-bold text-[var(--color-orange)]">
                    {streak}
                    {lastFreezedDate === today && <span className="text-[9px] ml-0.5 align-super text-[var(--color-blue)]">ICE</span>}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-orange)]" style={{ opacity: 0.7 }}>
                    Streak{streakFreezes > 0 ? ` +${streakFreezes}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 text-[var(--color-text-muted)]">
                <span className="font-semibold">Level {level + 1}</span>
                <span className="font-mono text-[11px]">{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
              </div>
              <div className="h-3 bg-[var(--color-bg-dark)] rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--color-purple)] via-[var(--color-blue)] to-[var(--color-purple)] rounded-full relative"
                  style={{ backgroundSize: '200% 100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(xpProgress, 100)}%`, backgroundPosition: ['0% 0%', '100% 0%'] }}
                  transition={{ width: { duration: 1.2, ease: 'easeOut' }, backgroundPosition: { duration: 3, repeat: Infinity, repeatType: 'reverse' } }}
                />
                {/* Shimmer overlay */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="shimmer w-full h-full" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Productivity Score + Today's Summary */}
          <motion.div className="grid grid-cols-2 gap-3 mb-4" variants={fadeUp}>
            {/* Productivity Score */}
            <div className="rpg-card flex flex-col items-center justify-center py-5">
              <div className="relative w-24 h-24 mb-3">
                {/* Background glow */}
                <div className="absolute inset-2 rounded-full blur-lg" style={{ background: scoreGlow }} />
                <svg viewBox="0 0 80 80" className="-rotate-90 w-full h-full relative z-10">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="5" opacity="0.3" />
                  <motion.circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - productivityScore / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    style={{ filter: `drop-shadow(0 0 6px ${scoreGlow})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <motion.p
                    className="text-2xl font-black"
                    style={{ color: scoreColor }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                  >
                    {productivityScore}
                  </motion.p>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] font-bold">Productivity</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: scoreColor }}>
                {productivityScore >= 80 ? 'Legendary!' : productivityScore >= 50 ? 'Keep pushing!' : 'Just warming up'}
              </p>
            </div>

            {/* Today's Activity */}
            <div className="rpg-card space-y-2.5">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em]">Today&apos;s Progress</p>
              {[
                { icon: Target, label: 'Quests', value: tasksCompletedToday, color: 'var(--color-green)', bg: 'rgba(74, 222, 128, 0.1)' },
                { icon: Repeat2, label: 'Habits', value: `${habitsCompletedToday}/${habits.length}`, color: 'var(--color-purple)', bg: 'rgba(167, 139, 250, 0.1)' },
                { icon: Flag, label: 'Goals', value: `${activeGoals.length} active`, color: 'var(--color-orange)', bg: 'rgba(251, 146, 60, 0.1)' },
                { icon: Trophy, label: 'Total', value: totalQuestsCompleted, color: 'var(--color-yellow)', bg: 'rgba(251, 191, 36, 0.1)' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: bg }}>
                  <div className="flex items-center gap-2 text-sm">
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
                  </div>
                  <span className="font-bold text-sm" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>



          {/* Weekly Strategy Planner */}
          <motion.div className="mb-4" variants={fadeUp}>
            <WeeklyPlanner />
          </motion.div>

          {/* Quick Actions Row */}
          <motion.div className="grid grid-cols-4 gap-2.5 mb-4" variants={fadeUp}>
            {[
              { href: '/quests', icon: Target, label: 'Quests', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', glow: 'rgba(74, 222, 128, 0.15)' },
              { href: '/habits', icon: Repeat2, label: 'Habits', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', glow: 'rgba(167, 139, 250, 0.15)' },
              { href: '/focus', icon: Timer, label: 'Focus', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', glow: 'rgba(96, 165, 250, 0.15)' },
              { href: '/goals', icon: Flag, label: 'Goals', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)', glow: 'rgba(251, 146, 60, 0.15)' },
            ].map(({ href, icon: Icon, label, color, bg, glow }) => (
              <Link key={href} href={href}>
                <motion.div
                  className="rpg-card !p-3.5 flex flex-col items-center gap-2 cursor-pointer !border-transparent"
                  whileHover={{ scale: 1.06, y: -3, boxShadow: `0 8px 24px ${glow}` }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{label}</p>
                </motion.div>
              </Link>
            ))}
          </motion.div>

          {/* Habit Streak Strip */}
          {habits.length > 0 && (
            <motion.div className="mb-4" variants={fadeUp}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-[0.15em] uppercase">Today&apos;s Habits</p>
                <Link href="/habits" className="text-[11px] font-semibold text-[var(--color-purple)] hover:text-[var(--color-purple-light)] transition-colors">View all</Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {habits.map(habit => {
                  const doneToday = habit.completedDates.includes(today);
                  return (
                    <motion.button
                      key={habit.id}
                      onClick={() => { if (!doneToday) { completeHabit(habit.id); addToast(`${habit.name} completed!`, 'success'); } }}
                      disabled={doneToday}
                      className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all ${doneToday
                        ? 'border-[var(--color-green)]/40 bg-[var(--color-green)]/10'
                        : 'border-[var(--color-border)] hover:border-[var(--color-purple)]/40 bg-[var(--color-bg-card)]'
                        }`}
                      whileHover={!doneToday ? { scale: 1.04, y: -2 } : {}}
                      whileTap={!doneToday ? { scale: 0.96 } : {}}
                    >
                      <span className="text-lg">{habit.icon}</span>
                      <span className="text-[11px] font-semibold max-w-[64px] truncate">{habit.name}</span>
                      <span className={`text-[10px] font-bold ${doneToday ? 'text-[var(--color-green)]' : 'text-[var(--color-text-muted)]'}`}>
                        {doneToday ? '✓ Done' : habit.streak > 0 ? `${habit.streak}d streak` : 'Tap'}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Daily Quests + Daily Reward Row */}
          <motion.div className="grid grid-cols-2 gap-3 mb-4" variants={fadeUp}>
            {/* Daily Quests */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[var(--color-green)]/10 flex items-center justify-center">
                  <Target className="text-[var(--color-green)]" size={14} />
                </div>
                <h3 className="font-bold text-sm">Daily Quests</h3>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-green)]/10 text-[var(--color-green)]">{completedDailyQuests}/{dailyQuests.length}</span>
              </div>
              <div className="space-y-1">
                {dailyQuests.slice(0, 3).map(quest => (
                  <button
                    key={quest.id}
                    onClick={() => {
                      if (!quest.isExpired) {
                        toggleDailyQuest(quest.id);
                        if (!quest.completed) {
                          addToast(`+${quest.xpReward} XP earned!`, 'success');
                        }
                      }
                    }}
                    disabled={quest.isExpired}
                    className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-all ${quest.isExpired ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--color-bg-dark)] cursor-pointer'}`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] transition-all ${quest.completed ? 'border-[var(--color-green)] bg-[var(--color-green)] text-white' : 'border-[var(--color-border)]'}`}>
                      {quest.completed && '✓'}
                    </span>
                    <span className={`truncate text-xs ${quest.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'}`}>
                      {quest.title}
                    </span>
                  </button>
                ))}
              </div>
              <Link href="/quests" className="text-[11px] font-semibold text-[var(--color-purple)] mt-2.5 block hover:text-[var(--color-purple-light)] transition-colors">
                View all quests
              </Link>
            </div>

            {/* Daily Login */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[var(--color-yellow)]/10 flex items-center justify-center">
                  <Gift className="text-[var(--color-yellow)]" size={14} />
                </div>
                <h3 className="font-bold text-sm">Daily Login</h3>
              </div>
              {canClaimDaily ? (
                <motion.button
                  onClick={handleClaimDailyReward}
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-[var(--color-yellow)] to-[#f59e0b] flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Gift size={15} /> Claim Reward!
                </motion.button>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-[var(--color-text-muted)]">Claimed today!</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Come back tomorrow</p>
                </div>
              )}
              <div className="flex justify-center gap-1.5 mt-3">
                {[1, 2, 3, 4, 5, 6, 7].map(day => {
                  const isFilled = day <= (loginStreak % 7) + 1;
                  return (
                    <div
                      key={day}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${isFilled
                        ? 'bg-gradient-to-br from-[var(--color-yellow)] to-[#f59e0b] text-black shadow-sm'
                        : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      style={isFilled ? { boxShadow: '0 0 8px rgba(251, 191, 36, 0.2)' } : {}}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Active Buffs */}
          <AnimatePresence>
            {activeBuffs.length > 0 && (
              <motion.div
                className="rpg-card mb-4 !border-[var(--color-green)]/30 glow-green"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
                  <Flame className="text-[var(--color-green)]" size={16} />
                  Active Buffs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeBuffs.map((buff, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 bg-[var(--color-green)]/10 text-[var(--color-green)] rounded-lg font-semibold border border-[var(--color-green)]/20">
                      {buff.type} x{buff.value} ({getRemainingMinutes(buff.expiresAt)}m)
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Plan Generator */}
          <motion.div
            className="rpg-card mb-5 !border-[var(--color-purple)]/20 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(96, 165, 250, 0.08))' }}
            variants={fadeUp}
          >
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[var(--color-purple)]/10 blur-2xl" />
            <div className="flex items-center justify-between relative">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-purple)]/15 flex items-center justify-center">
                    <Sparkles className="text-[var(--color-purple)]" size={15} />
                  </div>
                  AI Quest Generator
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-9">
                  Personalized quests powered by Gemini
                </p>
              </div>
              <motion.button
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)] disabled:opacity-50 flex items-center gap-2"
                whileHover={!isGeneratingPlan ? { scale: 1.05, boxShadow: '0 4px 20px rgba(167, 139, 250, 0.3)' } : {}}
                whileTap={!isGeneratingPlan ? { scale: 0.95 } : {}}
              >
                {isGeneratingPlan ? (
                  <><Zap size={14} className="animate-spin" /> Generating...</>
                ) : (
                  <><Zap size={14} /> Generate</>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Full Menu Grid */}
          <motion.div variants={fadeUp}>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-[0.15em] uppercase mb-2.5">All Modules</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                  >
                    <Link href={item.href}>
                      <motion.div
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] transition-all group"
                        whileHover={{ y: -2, borderColor: item.color, boxShadow: `0 4px 16px rgba(0,0,0,0.2)` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}>
                            <Icon size={16} style={{ color: item.color }} />
                          </div>
                          <span className="font-semibold text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{item.label}</span>
                        </div>
                        <ChevronRight size={14} className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform" />
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
