'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Lock, Share2, Trophy, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToastStore } from '@/components/ToastContainer';

const ACHIEVEMENTS_DATA = [
  // Common
  { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest', icon: '⚔️', rarity: 'common' },
  { id: 'HABIT_BUILDER', name: 'Habit Builder', description: 'Create 5 habits', icon: '🌱', rarity: 'common' },
  // Rare
  { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5', icon: '⭐', rarity: 'rare' },
  { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests', icon: '📜', rarity: 'rare' },
  { id: 'CRAFTSMAN', name: 'Craftsman', description: 'Craft your first item', icon: '🔨', rarity: 'rare' },
  { id: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'rare' },
  { id: 'DAILY_COMPLETE', name: 'Daily Grind', description: 'Complete all daily quests in a day', icon: '✅', rarity: 'rare' },
  { id: 'GOAL_GETTER', name: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', rarity: 'rare' },
  { id: 'REFLECTOR', name: 'Self Reflector', description: 'Submit 7 evening reflections', icon: '🌙', rarity: 'rare' },
  // Epic
  { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat a boss battle', icon: '🐉', rarity: 'epic' },
  { id: 'TITLE_MASTER', name: 'Titled', description: 'Obtain the Master title', icon: '🎖️', rarity: 'epic' },
  { id: 'HABIT_HERO', name: 'Habit Hero', description: 'Complete a habit 7 days in a row', icon: '🏆', rarity: 'epic' },
  { id: 'EPIC_SLAYER', name: 'Epic Slayer', description: 'Complete 10 Epic difficulty quests', icon: '⚡', rarity: 'epic' },
  { id: 'SCHOLAR_ELITE', name: 'Scholar Elite', description: 'Complete 25 Study category quests', icon: '📚', rarity: 'epic' },
  { id: 'HEALTH_WARRIOR', name: 'Health Warrior', description: 'Complete 25 Health category quests', icon: '💪', rarity: 'epic' },
  // Legendary
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

export default function AchievementsPage() {
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
      : `🎮 Working towards unlocking "${achievement.name}" in QuestFlow! ${achievement.description}\n\nLevel: ${level} | Title: ${title}`;

    if (navigator.share) {
      navigator.share({
        title: 'QuestFlow Achievement',
        text: shareText,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(shareText);
      addToast('Copied to clipboard!', 'success');
    }
  };

  const handleShareAll = () => {
    const shareText = `🎮 QuestFlow Progress Update! 🚀\n\nLevel: ${level} | Title: ${title}\nXP: ${xp.toLocaleString()} | Gold: ${gold} | Gems: ${gems}\nQuests: ${totalQuestsCompleted} | Streak: ${streak} days | Login: ${loginStreak} days\n\nAchievements: ${unlockedCount}/${totalCount} unlocked!`;

    if (navigator.share) {
      navigator.share({
        title: 'QuestFlow Progress',
        text: shareText,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(shareText);
      addToast('Copied to clipboard!', 'success');
    }
  };

  return (
    <motion.div
      className="min-h-screen pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="text-[var(--color-yellow)]" />
              Achievements
            </h1>
          </div>
          <button
            onClick={handleShareAll}
            className="rpg-button !bg-[var(--color-blue)] !text-white"
          >
            <Share2 size={18} />
            Share Progress
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <motion.div
          className="rpg-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Your Stats</h2>
            <span className="text-[var(--color-yellow)] font-bold">{unlockedCount}/{totalCount}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-[var(--color-bg-dark)] rounded">
              <p className="text-2xl font-bold text-[var(--color-purple)]">{level}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Level</p>
            </div>
            <div className="text-center p-3 bg-[var(--color-bg-dark)] rounded">
              <p className="text-2xl font-bold text-[var(--color-green)]">{totalQuestsCompleted}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Quests</p>
            </div>
            <div className="text-center p-3 bg-[var(--color-bg-dark)] rounded">
              <p className="text-2xl font-bold text-[var(--color-orange)]">{streak}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Streak</p>
            </div>
            <div className="text-center p-3 bg-[var(--color-bg-dark)] rounded">
              <p className="text-2xl font-bold text-[var(--color-blue)]">{loginStreak}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Login Days</p>
            </div>
          </div>
        </motion.div>

        {/* Filter Buttons */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex gap-2">
            {(['all', 'unlocked', 'locked'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === f
                  ? 'bg-[var(--color-purple)] text-white'
                  : 'bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                  }`}
              >
                {f === 'all' ? '🏅 All' : f === 'unlocked' ? '✅ Unlocked' : '🔒 Locked'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement, index) => {
            const isUnlocked = achievements.includes(achievement.id);

            return (
              <motion.div
                key={achievement.id}
                className={`rpg-card border-2 ${isUnlocked ? RARITY_COLORS[achievement.rarity] : 'border-[var(--color-border)] opacity-60'}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isUnlocked ? 1 : 0.6, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <motion.span
                      className="text-3xl"
                      animate={{ rotate: isUnlocked ? [0, 10, 0] : 0 }}
                      transition={{ repeat: isUnlocked ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                    >
                      {achievement.icon}
                    </motion.span>
                    <div>
                      <h3 className="font-bold">{achievement.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)] capitalize">{achievement.rarity}</p>
                    </div>
                  </div>
                  {isUnlocked ? (
                    <Trophy className="text-[var(--color-yellow)]" size={20} />
                  ) : (
                    <Lock size={20} className="text-[var(--color-text-muted)]" />
                  )}
                </div>

                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  {achievement.description}
                </p>

                <button
                  onClick={() => handleShare(achievement)}
                  className={`w-full rpg-button text-sm ${isUnlocked
                    ? '!bg-[var(--color-blue)] !text-white'
                    : '!bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]'
                    }`}
                >
                  <Share2 size={14} />
                  {isUnlocked ? 'Share Achievement' : 'Share Progress'}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* AI Discovered Achievements */}
        {dynamicAchievements.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[var(--color-purple)]" />
              <h3 className="font-bold text-lg">AI Discovered</h3>
              <span className="text-xs rpg-badge bg-[var(--color-purple)]/20 text-[var(--color-purple)]">{dynamicAchievements.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dynamicAchievements.map((da, i) => (
                <motion.div
                  key={`dynamic-${i}`}
                  className="rpg-card !border-[var(--color-purple)]/50 !bg-gradient-to-br from-[var(--color-purple)]/10 to-transparent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{da.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm">{da.name}</h4>
                      <p className="text-xs text-[var(--color-text-muted)]">{new Date(da.earnedAt).toLocaleDateString()}</p>
                    </div>
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
    </motion.div>
  );
}
