'use client';

import { useGameStore } from '@/store/useGameStore';
import Link from 'next/link';
import { Target, Zap, Flame, Trophy, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function AnalyticsPage() {
  const { xp, level, streak, tasks } = useGameStore();
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

  const difficultyCount = {
    Easy: tasks.filter(t => t.difficulty === 'Easy' && t.completed).length,
    Medium: tasks.filter(t => t.difficulty === 'Medium' && t.completed).length,
    Hard: tasks.filter(t => t.difficulty === 'Hard' && t.completed).length,
    Epic: tasks.filter(t => t.difficulty === 'Epic' && t.completed).length,
  };

  const statsCards = [
    { icon: Target, label: 'Quests Done', value: completedTasks, color: 'var(--color-green)' },
    { icon: Zap, label: 'Total XP', value: xp, color: 'var(--color-yellow)' },
    { icon: Flame, label: 'Day Streak', value: streak, color: 'var(--color-orange)' },
    { icon: Trophy, label: 'Current Level', value: level, color: 'var(--color-blue)' },
  ];

  // Generate stable weekly data using useMemo
  const weeklyData = useMemo(() => {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
      day,
      index,
      height: 20 + (index * 10) % 60 + 20, // Deterministic pseudo-random heights
      isToday: index === new Date().getDay() - 1
    }));
  }, []);

  return (
    <motion.div 
      className="min-h-screen pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Skills & Statistics</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Intro Text */}
        <motion.div 
          className="mb-8 border-l-4 border-[var(--color-purple)] pl-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[var(--color-purple)] italic font-medium">
            Track your progress and skill development.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="rpg-card text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div 
                  className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: stat.color }}
                >
                  <Icon className="text-white" size={24} />
                </div>
                <motion.p 
                  className="text-2xl font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-sm text-[var(--color-text-secondary)]">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Difficulty Breakdown */}
        <motion.div 
          className="rpg-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-bold mb-6">Quests by Difficulty</h2>
          <div className="space-y-4">
            {Object.entries(difficultyCount).map(([difficulty, count], index) => {
              const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              const colors = {
                Easy: 'var(--color-badge-green)',
                Medium: 'var(--color-badge-blue)',
                Hard: 'var(--color-badge-yellow)',
                Epic: 'var(--color-badge-purple)',
              };
              
              return (
                <motion.div 
                  key={difficulty}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{difficulty}</span>
                    <span className="text-[var(--color-text-secondary)]">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors[difficulty as keyof typeof colors] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Weekly Progress */}
        <motion.div 
          className="rpg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <h2 className="text-xl font-bold mb-6">Weekly Activity</h2>
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map(({ day, index, height, isToday }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <motion.div 
                  className={`w-full rounded-t transition-all ${
                    isToday ? 'bg-[var(--color-purple)]' : 'bg-[var(--color-purple)]/60'
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                  whileHover={{ opacity: 0.8 }}
                />
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{day}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
