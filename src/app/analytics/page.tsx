'use client';

import { useGameStore, TimelineEvent } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  Target, Zap, Flame, Trophy, ChevronLeft, ChevronRight,
  Lock, Share2, Sparkles, Plus, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ContributionHeatmap from '@/components/ContributionHeatmap';

type Tab = 'stats' | 'achievements' | 'timeline';

// ── Achievements constants ──
const ACHIEVEMENTS_DATA = [
  { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest', icon: '⚔️', rarity: 'common' },
  { id: 'HABIT_BUILDER', name: 'Habit Builder', description: 'Create 5 habits', icon: '🌱', rarity: 'common' },
  { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5', icon: '⭐', rarity: 'rare' },
  { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests', icon: '📜', rarity: 'rare' },
  { id: 'CRAFTSMAN', name: 'Craftsman', description: 'Craft your first item', icon: '🔨', rarity: 'rare' },
  { id: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'rare' },
  { id: 'DAILY_COMPLETE', name: 'Daily Grind', description: 'Complete all daily quests in a day', icon: '✅', rarity: 'rare' },
  { id: 'GOAL_GETTER', name: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', rarity: 'rare' },
  { id: 'REFLECTOR', name: 'Self Reflector', description: 'Submit 7 evening reflections', icon: '🌙', rarity: 'rare' },
  { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat a boss battle', icon: '🐉', rarity: 'epic' },
  { id: 'TITLE_MASTER', name: 'Titled', description: 'Obtain the Master title', icon: '🎖️', rarity: 'epic' },
  { id: 'HABIT_HERO', name: 'Habit Hero', description: 'Complete a habit 7 days in a row', icon: '🏆', rarity: 'epic' },
  { id: 'EPIC_SLAYER', name: 'Epic Slayer', description: 'Complete 10 Epic difficulty quests', icon: '⚡', rarity: 'epic' },
  { id: 'SCHOLAR_ELITE', name: 'Scholar Elite', description: 'Complete 25 Study category quests', icon: '📚', rarity: 'epic' },
  { id: 'HEALTH_WARRIOR', name: 'Health Warrior', description: 'Complete 25 Health category quests', icon: '💪', rarity: 'epic' },
  { id: 'QUEST_CENTURION', name: 'Centurion', description: 'Complete 100 quests', icon: '💯', rarity: 'legendary' },
  { id: 'STREAK_30', name: 'Streak Legend', description: 'Maintain a 30-day streak', icon: '👑', rarity: 'legendary' },
  { id: 'LEVEL_20', name: 'Veteran', description: 'Reach Level 20', icon: '💎', rarity: 'legendary' },
  { id: 'LOGIN_30', name: 'Dedicated', description: 'Login 30 days in a row', icon: '📅', rarity: 'legendary' },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'border-[var(--color-text-muted)] bg-[var(--color-text-muted)]/10',
  rare: 'border-[var(--color-blue)] bg-[var(--color-blue)]/10',
  epic: 'border-[var(--color-purple)] bg-[var(--color-purple)]/10',
  legendary: 'border-[var(--color-yellow)] bg-[var(--color-yellow)]/10',
};

// ── Timeline constants ──
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ─────────────────────────────────────────────
function StatsTab() {
  const { xp, level, streak, tasks, habits } = useGameStore();
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

  const allActivityDates = useMemo(() => {
    const dates: string[] = [];
    tasks.forEach(t => { if (t.completed && t.completedAt) dates.push(t.completedAt.split('T')[0]); });
    habits.forEach(h => { h.completedDates.forEach(d => dates.push(d)); });
    return dates;
  }, [tasks, habits]);

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

  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const countByDate: Record<string, number> = {};
    tasks.forEach(t => { if (t.completed && t.completedAt) { const d = t.completedAt.split('T')[0]; countByDate[d] = (countByDate[d] || 0) + 1; } });
    return days.map((day, index) => {
      const jsDay = (index + 1) % 7;
      const offset = (today.getDay() - jsDay + 7) % 7;
      const date = new Date(today); date.setDate(today.getDate() - offset);
      const dateStr = date.toISOString().split('T')[0];
      const count = countByDate[dateStr] || 0;
      const isToday = offset === 0;
      return { day, index, height: Math.min(4 + count * 18, 100), count, isToday };
    });
  }, [tasks]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.div className="mb-6 border-l-4 border-[var(--color-purple)] pl-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-[var(--color-purple)] italic font-medium">Track your progress and skill development.</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="rpg-card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.1 }} whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: stat.color }}>
                <Icon className="text-white" size={24} />
              </div>
              <motion.p className="text-2xl font-bold" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}>{stat.value}</motion.p>
              <p className="text-sm text-[var(--color-text-secondary)]">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div className="rpg-card mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h2 className="text-xl font-bold mb-6">Quests by Difficulty</h2>
        <div className="space-y-4">
          {Object.entries(difficultyCount).map(([difficulty, count], index) => {
            const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
            const colors = { Easy: 'var(--color-badge-green)', Medium: 'var(--color-badge-blue)', Hard: 'var(--color-badge-yellow)', Epic: 'var(--color-badge-purple)' };
            return (
              <motion.div key={difficulty} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + index * 0.1 }}>
                <div className="flex justify-between mb-2"><span className="font-semibold">{difficulty}</span><span className="text-[var(--color-text-secondary)]">{count}</span></div>
                <div className="h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: colors[difficulty as keyof typeof colors] }}
                    initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div className="rpg-card mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <h2 className="text-xl font-bold mb-6">Weekly Activity</h2>
        <div className="flex items-end justify-between h-32 gap-2">
          {weeklyData.map(({ day, index, height, count, isToday }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-2 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {count} quest{count !== 1 ? 's' : ''}
              </div>
              <motion.div className={`w-full rounded-t transition-all ${isToday ? 'bg-[var(--color-purple)]' : 'bg-[var(--color-purple)]/60'}`}
                initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: 1.0 + index * 0.1, duration: 0.5 }} whileHover={{ opacity: 0.8 }} />
              <span className={`text-xs font-semibold ${isToday ? 'text-[var(--color-purple)]' : 'text-[var(--color-text-secondary)]'}`}>{day}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="rpg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Activity Heatmap</h2>
          <span className="text-xs text-[var(--color-text-muted)]">{allActivityDates.length} total actions</span>
        </div>
        <ContributionHeatmap dates={allActivityDates} color="var(--color-green)" />
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
function AchievementsTab() {
  const { level, xp, achievements, dynamicAchievements, totalQuestsCompleted, streak, title, loginStreak, gold, gems } = useGameStore();
  const { addToast } = useToastStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS_DATA.length;
  const filteredAchievements = ACHIEVEMENTS_DATA.filter(a => {
    if (filter === 'unlocked') return achievements.includes(a.id);
    if (filter === 'locked') return !achievements.includes(a.id);
    return true;
  });

  const handleShare = (achievement: typeof ACHIEVEMENTS_DATA[0]) => {
    const isUnlocked = achievements.includes(achievement.id);
    const shareText = isUnlocked
      ? `🎮 I just unlocked "${achievement.name}" in QuestFlow! ${achievement.description} 🚀\n\nLevel: ${level} | Title: ${title} | Streak: ${streak} days`
      : `🎮 Working towards "${achievement.name}" in QuestFlow! ${achievement.description}\n\nLevel: ${level} | Title: ${title}`;
    if (navigator.share) navigator.share({ title: 'QuestFlow Achievement', text: shareText }).catch(() => {});
    else { navigator.clipboard.writeText(shareText); addToast('Copied to clipboard!', 'success'); }
  };

  const handleShareAll = () => {
    const shareText = `🎮 QuestFlow Progress Update! 🚀\n\nLevel: ${level} | Title: ${title}\nXP: ${xp.toLocaleString()} | Gold: ${gold} | Gems: ${gems}\nQuests: ${totalQuestsCompleted} | Streak: ${streak} days | Login: ${loginStreak} days\n\nAchievements: ${unlockedCount}/${totalCount} unlocked!`;
    if (navigator.share) navigator.share({ title: 'QuestFlow Progress', text: shareText }).catch(() => {});
    else { navigator.clipboard.writeText(shareText); addToast('Copied to clipboard!', 'success'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-end mb-4">
        <button onClick={handleShareAll} className="rpg-button !bg-[var(--color-blue)] !text-white"><Share2 size={18} /> Share Progress</button>
      </div>

      <motion.div className="rpg-card mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Your Stats</h2>
          <span className="text-[var(--color-yellow)] font-bold">{unlockedCount}/{totalCount}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: level, label: 'Level', color: 'var(--color-purple)' },
            { value: totalQuestsCompleted, label: 'Quests', color: 'var(--color-green)' },
            { value: streak, label: 'Streak', color: 'var(--color-orange)' },
            { value: loginStreak, label: 'Login Days', color: 'var(--color-blue)' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-[var(--color-bg-dark)] rounded">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-2">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === f ? 'bg-[var(--color-purple)] text-white' : 'bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'}`}>
              {f === 'all' ? '🏅 All' : f === 'unlocked' ? '✅ Unlocked' : '🔒 Locked'}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement, index) => {
          const isUnlocked = achievements.includes(achievement.id);
          return (
            <motion.div key={achievement.id}
              className={`rpg-card border-2 ${isUnlocked ? RARITY_COLORS[achievement.rarity] : 'border-[var(--color-border)] opacity-60'}`}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: isUnlocked ? 1 : 0.6, scale: 1 }} transition={{ delay: index * 0.05 }} whileHover={{ scale: 1.02 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.span className="text-3xl" animate={{ rotate: isUnlocked ? [0, 10, 0] : 0 }} transition={{ repeat: isUnlocked ? Infinity : 0, duration: 2, ease: 'easeInOut' }}>
                    {achievement.icon}
                  </motion.span>
                  <div>
                    <h3 className="font-bold">{achievement.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] capitalize">{achievement.rarity}</p>
                  </div>
                </div>
                {isUnlocked ? <Trophy className="text-[var(--color-yellow)]" size={20} /> : <Lock size={20} className="text-[var(--color-text-muted)]" />}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">{achievement.description}</p>
              <button onClick={() => handleShare(achievement)}
                className={`w-full rpg-button text-sm ${isUnlocked ? '!bg-[var(--color-blue)] !text-white' : '!bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]'}`}>
                <Share2 size={14} /> {isUnlocked ? 'Share Achievement' : 'Share Progress'}
              </button>
            </motion.div>
          );
        })}
      </div>

      {dynamicAchievements.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-[var(--color-purple)]" />
            <h3 className="font-bold text-lg">AI Discovered</h3>
            <span className="text-xs rpg-badge bg-[var(--color-purple)]/20 text-[var(--color-purple)]">{dynamicAchievements.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dynamicAchievements.map((da, i) => (
              <motion.div key={`dynamic-${i}`}
                className="rpg-card !border-[var(--color-purple)]/50 !bg-gradient-to-br from-[var(--color-purple)]/10 to-transparent"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{da.icon}</span>
                  <div><h4 className="font-bold text-sm">{da.name}</h4><p className="text-xs text-[var(--color-text-muted)]">{new Date(da.earnedAt).toLocaleDateString()}</p></div>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{da.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy size={48} className="mx-auto mb-4 opacity-30 text-[var(--color-yellow)]" />
          <p className="text-[var(--color-text-secondary)]">No achievements found</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
function TimelineTab() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const { timelineEvents, addTimelineEvent, deleteTimelineEvent } = useGameStore();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventSubject, setNewEventSubject] = useState('Math');
  const [newEventStatus, setNewEventStatus] = useState<'Ready' | 'Not Ready' | 'Confident' | 'Getting There'>('Not Ready');

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim() || !newEventDate) return;
    const statusColorMap = { 'Ready': 'blue' as const, 'Not Ready': 'red' as const, 'Confident': 'green' as const, 'Getting There': 'orange' as const };
    addTimelineEvent(newEventName, newEventDate, newEventSubject, newEventStatus, statusColorMap[newEventStatus]);
    setNewEventName(''); setNewEventDate(''); setNewEventSubject('Math'); setNewEventStatus('Not Ready'); setShowAddEvent(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="calendar-day opacity-0" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
      const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasEvent = timelineEvents.some(e => e.date === dayStr);
      days.push(
        <motion.div key={day} className={`calendar-day ${isToday ? 'today' : ''} relative`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {day}
          {hasEvent && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-purple)]" />}
        </motion.div>
      );
    }
    return days;
  };

  const getStatusBadgeClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-[var(--color-badge-blue)] text-white';
      case 'green': return 'bg-[var(--color-badge-green)] text-white';
      case 'orange': return 'bg-[var(--color-badge-yellow)] text-white';
      case 'red': return 'bg-[var(--color-badge-red)] text-white';
      default: return 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]';
    }
  };

  const getSubjectBadgeClass = (subject: string) => {
    switch (subject) {
      case 'Math': return 'bg-[var(--color-badge-yellow)]/20 text-[var(--color-badge-yellow)]';
      case 'Science': return 'bg-[var(--color-badge-blue)]/20 text-[var(--color-badge-blue)]';
      case 'Humanities': return 'bg-[var(--color-badge-green)]/20 text-[var(--color-badge-green)]';
      case 'English': return 'bg-[var(--color-badge-yellow)]/20 text-[var(--color-badge-yellow)]';
      default: return 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <motion.div className="mb-6 border-l-4 border-[var(--color-purple)] pl-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-[var(--color-purple)] italic font-medium">This is your master calendar and test tracker.</p>
      </motion.div>

      {/* Calendar */}
      <div className="mb-10">
        <motion.div className="rpg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Calendar</h2>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1 hover:bg-[var(--color-bg-hover)] rounded transition-colors" aria-label="Previous month">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))} className="text-sm font-medium px-2 py-0.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors">Today</button>
              <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1 hover:bg-[var(--color-bg-hover)] rounded transition-colors" aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS.map((day) => <div key={day} className="text-center text-xs font-medium text-[var(--color-text-secondary)] py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
        </motion.div>
      </div>

      {/* Upcoming Tests */}
      <motion.div className="rpg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Upcoming Tests</h2>
          <button onClick={() => setShowAddEvent(!showAddEvent)}
            className="px-3 py-1 bg-[var(--color-blue)] text-white rounded text-xs font-medium hover:bg-[var(--color-purple)] transition-colors flex items-center gap-1">
            <Plus size={14} /> New
          </button>
        </div>

        <AnimatePresence>
          {showAddEvent && (
            <motion.form onSubmit={handleAddEvent} className="mb-6 p-4 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="space-y-3">
                <input type="text" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="Test name" className="input-field" />
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="input-field" />
                <select value={newEventSubject} onChange={(e) => setNewEventSubject(e.target.value)} className="input-field">
                  <option>Math</option><option>Science</option><option>English</option><option>Humanities</option>
                </select>
                <select value={newEventStatus} onChange={(e) => setNewEventStatus(e.target.value as typeof newEventStatus)} className="input-field">
                  <option>Ready</option><option>Not Ready</option><option>Confident</option><option>Getting There</option>
                </select>
                <button type="submit" className="rpg-button w-full !bg-[var(--color-purple)] !text-white">Add Event</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <AnimatePresence>
            {timelineEvents.map((test: TimelineEvent, index: number) => (
              <motion.div key={test.id}
                className="flex items-center justify-between p-3 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }}>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-text-muted)]">📄</span>
                  <span className="font-medium">{test.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--color-text-secondary)]">{new Date(test.date).toLocaleDateString()}</span>
                  <span className={`rpg-badge ${getSubjectBadgeClass(test.subject)}`}>{test.subject}</span>
                  <span className={`rpg-badge ${getStatusBadgeClass(test.statusColor)}`}>{test.status}</span>
                  <button onClick={() => deleteTimelineEvent(test.id)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {timelineEvents.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">No upcoming tests. Click &quot;New&quot; to add one!</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
  ];

  return (
    <motion.div className="min-h-screen pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 pt-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Progress</h1>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 mt-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-purple)] text-[var(--color-purple)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'achievements' && <AchievementsTab />}
      {activeTab === 'timeline' && <TimelineTab />}
    </motion.div>
  );
}
