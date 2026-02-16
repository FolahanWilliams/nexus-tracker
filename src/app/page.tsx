'use client';

import { useGameStore } from '@/store/useGameStore';
import Link from 'next/link';
import { 
  Target, 
  ShoppingBag, 
  Trophy, 
  Zap, 
  Flame, 
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { xp, level, gold, streak, tasks } = useGameStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Calculate XP to next level
  const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
  const nextLevelBaseXP = Math.pow(level, 2) * 100;
  const xpNeededForLevel = nextLevelBaseXP - currentLevelBaseXP;
  const currentXPInLevel = xp - currentLevelBaseXP;
  const xpProgress = Math.min(100, Math.max(0, (currentXPInLevel / xpNeededForLevel) * 100));

  const recentTasks = tasks.slice(-3).reverse();

  return (
    <div className="page-transition space-y-8">
      {/* Welcome Header */}
      <div className="animate-fade-in">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2">
          Welcome back, <span className="text-gradient">Champion</span>
        </h1>
        <p className="text-white/60 text-lg">
          Ready to conquer your quests today?
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card card-interactive p-6 animate-fade-in-up stagger-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Level</p>
              <p className="text-3xl font-bold">{level}</p>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${xpProgress}%` }} />
          </div>
          <p className="text-white/50 text-xs mt-2">{Math.floor(currentXPInLevel)} / {xpNeededForLevel} XP</p>
        </div>

        <div className="card card-interactive p-6 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Gold</p>
              <p className="text-3xl font-bold text-yellow-400">{gold}</p>
            </div>
          </div>
          <p className="text-white/50 text-sm">Spend in the shop</p>
        </div>

        <div className="card card-interactive p-6 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Flame className="text-white" size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Streak</p>
              <p className="text-3xl font-bold text-orange-400">{streak}</p>
            </div>
          </div>
          <p className="text-white/50 text-sm">Days in a row</p>
        </div>

        <div className="card card-interactive p-6 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Quests</p>
              <p className="text-3xl font-bold text-emerald-400">{completedTasks}/{totalTasks}</p>
            </div>
          </div>
          <p className="text-white/50 text-sm">Completed</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Continue Questing */}
        <Link href="/quests" className="card card-interactive p-6 group animate-fade-in-up stagger-1">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Target className="text-white" size={28} />
            </div>
            <ArrowRight className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">Continue Questing</h3>
          <p className="text-white/60">View and complete your active quests</p>
          {recentTasks.filter(t => !t.completed).length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-indigo-400">
              <Sparkles size={16} />
              <span>{recentTasks.filter(t => !t.completed).length} quests waiting</span>
            </div>
          )}
        </Link>

        {/* Visit Shop */}
        <Link href="/shop" className="card card-interactive p-6 group animate-fade-in-up stagger-2">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <ShoppingBag className="text-white" size={28} />
            </div>
            <ArrowRight className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">Visit Shop</h3>
          <p className="text-white/60">Spend your hard-earned gold</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-yellow-400">
            <Zap size={16} />
            <span>{gold} gold available</span>
          </div>
        </Link>

        {/* View Progress */}
        <Link href="/analytics" className="card card-interactive p-6 group animate-fade-in-up stagger-3">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="text-white" size={28} />
            </div>
            <ArrowRight className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">View Progress</h3>
          <p className="text-white/60">Track your productivity stats</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
            <TrendingUp size={16} />
            <span>{completedTasks} quests completed</span>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      {recentTasks.length > 0 && (
        <div className="card p-6 animate-fade-in-up stagger-4">
          <h3 className="text-xl font-bold mb-6">Recent Quests</h3>
          <div className="space-y-3">
            {recentTasks.map((task, index) => (
              <div 
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  task.completed 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-white/10 text-white/60'
                }`}>
                  <Target size={20} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${task.completed ? 'line-through text-white/50' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.difficulty === 'Easy' ? 'badge-easy' :
                      task.difficulty === 'Medium' ? 'badge-medium' :
                      task.difficulty === 'Hard' ? 'badge-hard' : 'badge-epic'
                    }`}>
                      {task.difficulty}
                    </span>
                    <span className="text-xs text-white/50">+{task.xpReward} XP</span>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  task.completed ? 'bg-emerald-400' : 'bg-orange-400'
                }`} />
              </div>
            ))}
          </div>
          <Link 
            href="/quests"
            className="btn btn-secondary w-full mt-4"
          >
            View All Quests
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
