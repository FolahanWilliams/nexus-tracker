'use client';

import { useGameStore, Title } from '@/store/useGameStore';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Trophy, 
  Medal, 
  Crown,
  Star,
  Flame,
  Gem,
  Coins,
  Zap
} from 'lucide-react';

// Mock leaderboard data (in a real app, this would come from a backend)
const MOCK_LEADERBOARD = [
  { rank: 1, name: 'DragonSlayer99', level: 50, title: 'Legend' as Title, quests: 520, streak: 120, xp: 24500 },
  { rank: 2, name: 'ProductivityPro', level: 42, title: 'Grandmaster' as Title, quests: 380, streak: 65, xp: 18200 },
  { rank: 3, name: 'QuestHunter', level: 38, title: 'Grandmaster' as Title, quests: 290, streak: 45, xp: 15800 },
  { rank: 4, name: 'FocusMaster', level: 35, title: 'Master' as Title, quests: 250, streak: 40, xp: 13200 },
  { rank: 5, name: 'DailyGrinder', level: 28, title: 'Master' as Title, quests: 180, streak: 35, xp: 9800 },
  { rank: 6, name: 'TaskDestroyer', level: 25, title: 'Expert' as Title, quests: 140, streak: 28, xp: 7500 },
  { rank: 7, name: 'GoalGetter', level: 22, title: 'Expert' as Title, quests: 110, streak: 22, xp: 5800 },
  { rank: 8, name: 'AchieverMax', level: 18, title: 'Expert' as Title, quests: 85, streak: 18, xp: 4200 },
  { rank: 9, name: 'RisingStar', level: 15, title: 'Journeyman' as Title, quests: 60, streak: 14, xp: 3100 },
  { rank: 10, name: 'BeginnerBoost', level: 12, title: 'Journeyman' as Title, quests: 40, streak: 10, xp: 2200 },
];

const TITLE_COLORS: Record<Title, string> = {
  'Novice': 'text-[var(--color-text-muted)]',
  'Apprentice': 'text-[var(--color-green)]',
  'Journeyman': 'text-[var(--color-blue)]',
  'Expert': 'text-[var(--color-purple)]',
  'Master': 'text-[var(--color-orange)]',
  'Grandmaster': 'text-[var(--color-red)]',
  'Legend': 'text-[var(--color-yellow)]'
};

export default function LeaderboardPage() {
  const { level, title, totalQuestsCompleted, streak, xp, characterName } = useGameStore();
  const [timeFilter, setTimeFilter] = useState<'all' | 'weekly' | 'daily'>('all');
  
  // Calculate user's rank (mock - in real app would compare against others)
  const userRank = MOCK_LEADERBOARD.length + 1;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="text-[var(--color-yellow)]" />;
      case 2: return <Medal className="text-gray-400" />;
      case 3: return <Medal className="text-amber-600" />;
      default: return <span className="text-[var(--color-text-muted)] font-bold">#{rank}</span>;
    }
  };

  return (
    <motion.div 
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="text-[var(--color-yellow)]" />
              Leaderboard
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* User Stats Card */}
        <motion.div 
          className="rpg-card mb-8 !bg-gradient-to-br from-[var(--color-purple)]/20 to-[var(--color-blue)]/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Your Current Stats</p>
              <h2 className="text-2xl font-bold">{characterName}</h2>
              <p className={`font-bold ${TITLE_COLORS[title]}`}>{title}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[var(--color-yellow)]">#{userRank}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Global Rank</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-purple)]">{level}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Level</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-green)]">{totalQuestsCompleted}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Quests</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-orange)]">{streak}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-blue)]">{xp.toLocaleString()}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Total XP</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'weekly', 'daily'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`rpg-button !py-2 !px-4 text-sm ${
                timeFilter === filter 
                  ? '!bg-[var(--color-yellow)] !text-black' 
                  : ''
              }`}
            >
              {filter === 'all' ? 'All Time' : filter === 'weekly' ? 'This Week' : 'Today'}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          {MOCK_LEADERBOARD.map((entry, index) => (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rpg-card flex items-center gap-4 ${
                entry.rank <= 3 ? '!border-[var(--color-yellow)]/30' : ''
              }`}
            >
              <div className="w-10 text-center">
                {getRankIcon(entry.rank)}
              </div>
              
              <div className="w-12 h-12 bg-[var(--color-bg-dark)] rounded-full flex items-center justify-center">
                {entry.rank === 1 ? (
                  <Crown className="text-[var(--color-yellow)]" size={24} />
                ) : (
                  <span className="text-lg font-bold">{entry.level}</span>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold">{entry.name}</h3>
                <p className={`text-xs ${TITLE_COLORS[entry.title]}`}>{entry.title}</p>
              </div>
              
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="flex items-center gap-1 text-[var(--color-green)]">
                    <Zap size={14} />
                    {entry.quests}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">Quests</p>
                </div>
                <div className="text-center">
                  <p className="flex items-center gap-1 text-[var(--color-orange)]">
                    <Flame size={14} />
                    {entry.streak}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">Streak</p>
                </div>
                <div className="text-center">
                  <p className="flex items-center gap-1 text-[var(--color-purple)]">
                    <Star size={14} />
                    {entry.xp.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">XP</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Your Position */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 rpg-card flex items-center gap-4 !border-[var(--color-purple)]"
        >
          <div className="w-10 text-center">
            <span className="text-[var(--color-purple)] font-bold">#{userRank}</span>
          </div>
          
          <div className="w-12 h-12 bg-[var(--color-purple)]/20 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--color-purple)]">{level}</span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold">{characterName} (You)</h3>
            <p className={`text-xs ${TITLE_COLORS[title]}`}>{title}</p>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="flex items-center gap-1 text-[var(--color-green)]">
                <Zap size={14} />
                {totalQuestsCompleted}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Quests</p>
            </div>
            <div className="text-center">
              <p className="flex items-center gap-1 text-[var(--color-orange)]">
                <Flame size={14} />
                {streak}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Streak</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
