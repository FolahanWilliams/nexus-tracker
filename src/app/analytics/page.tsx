'use client';

import { useGameStore } from '@/store/useGameStore';
import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  Target, 
  Trophy, 
  TrendingUp,
  Calendar,
  Zap,
  Flame
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export default function AnalyticsPage() {
  const { tasks, xp, level, streak, gold } = useGameStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed);
    const totalXP = completedTasks.reduce((sum, t) => sum + t.xpReward, 0);
    
    // Tasks by difficulty
    const difficultyData = [
      { name: 'Easy', value: completedTasks.filter(t => t.difficulty === 'Easy').length, color: '#10b981' },
      { name: 'Medium', value: completedTasks.filter(t => t.difficulty === 'Medium').length, color: '#06b6d4' },
      { name: 'Hard', value: completedTasks.filter(t => t.difficulty === 'Hard').length, color: '#f97316' },
      { name: 'Epic', value: completedTasks.filter(t => t.difficulty === 'Epic').length, color: '#a855f7' },
    ].filter(d => d.value > 0);

    // XP by day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const xpByDay = last7Days.map(date => {
      const dayXP = completedTasks
        .filter(t => t.completedAt?.startsWith(date))
        .reduce((sum, t) => sum + t.xpReward, 0);
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        xp: dayXP
      };
    });

    // Completion rate
    const completionRate = tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100) 
      : 0;

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      totalXP,
      completionRate,
      difficultyData,
      xpByDay
    };
  }, [tasks]);

  if (!mounted) return null;

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">Analytics</h1>
        <p className="text-white/60">Track your productivity journey</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Target className="text-white" size={20} />
            </div>
            <span className="text-white/60 text-sm">Completed</span>
          </div>
          <p className="text-3xl font-bold">{stats.completedTasks}</p>
          <p className="text-white/50 text-xs mt-1">out of {stats.totalTasks} quests</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <BarChart3 className="text-white" size={20} />
            </div>
            <span className="text-white/60 text-sm">Success Rate</span>
          </div>
          <p className="text-3xl font-bold">{stats.completionRate}%</p>
          <p className="text-white/50 text-xs mt-1">completion rate</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <span className="text-white/60 text-sm">Total XP</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalXP}</p>
          <p className="text-white/50 text-xs mt-1">earned from quests</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Flame className="text-white" size={20} />
            </div>
            <span className="text-white/60 text-sm">Current Streak</span>
          </div>
          <p className="text-3xl font-bold">{streak}</p>
          <p className="text-white/50 text-xs mt-1">days in a row</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* XP Over Time */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-400" />
            XP Earned (Last 7 Days)
          </h3>
          <div className="h-64">
            {stats.xpByDay.some(d => d.xp > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.xpByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 35, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px'
                    }}
                  />
                  <Bar dataKey="xp" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30">
                <p>No data yet. Complete some quests!</p>
              </div>
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Trophy size={20} className="text-purple-400" />
            Quests by Difficulty
          </h3>
          <div className="h-64">
            {stats.difficultyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 35, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30">
                <p>No data yet. Complete some quests!</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            {stats.difficultyData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-white/60">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievement Progress */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" />
          Level Progress
        </h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-gradient">{level}</p>
            <p className="text-white/50 text-sm mt-1">Current Level</p>
          </div>
          <div className="flex-1">
            <div className="progress-bar h-4">
              <div 
                className="progress-bar-fill h-4"
                style={{ 
                  width: `${Math.min(100, (xp % 100) / 100 * 100)}%`
                }}
              />
            </div>
            <p className="text-white/50 text-sm mt-2">
              {xp} total XP earned
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white/30">{level + 1}</p>
            <p className="text-white/50 text-sm mt-1">Next Level</p>
          </div>
        </div>
      </div>
    </div>
  );
}
