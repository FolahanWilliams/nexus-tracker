'use client';

import { useGameStore } from '@/store/useGameStore';
import { 
  Trophy, 
  Lock, 
  Unlock,
  Target,
  Zap,
  Flame,
  Star,
  Crown,
  Sword,
  Shield,
  Gem,
  Award
} from 'lucide-react';

const ACHIEVEMENTS_DATA = [
  {
    id: 'FIRST_BLOOD',
    name: 'First Steps',
    description: 'Complete your first quest',
    icon: Target,
    requirement: 1,
    type: 'tasks',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'NOVICE',
    name: 'Novice Adventurer',
    description: 'Complete 5 quests',
    icon: Sword,
    requirement: 5,
    type: 'tasks',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    id: 'WARRIOR',
    name: 'Quest Warrior',
    description: 'Complete 25 quests',
    icon: Shield,
    requirement: 25,
    type: 'tasks',
    color: 'from-indigo-400 to-purple-500'
  },
  {
    id: 'MASTER',
    name: 'Quest Master',
    description: 'Complete 50 quests',
    icon: Crown,
    requirement: 50,
    type: 'tasks',
    color: 'from-purple-400 to-pink-500'
  },
  {
    id: 'LEGEND',
    name: 'Legendary Hero',
    description: 'Complete 100 quests',
    icon: Star,
    requirement: 100,
    type: 'tasks',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    id: 'LEVEL_5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: Zap,
    requirement: 5,
    type: 'level',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'LEVEL_10',
    name: 'Power Player',
    description: 'Reach Level 10',
    icon: Award,
    requirement: 10,
    type: 'level',
    color: 'from-orange-400 to-red-500'
  },
  {
    id: 'LEVEL_25',
    name: 'Epic Champion',
    description: 'Reach Level 25',
    icon: Gem,
    requirement: 25,
    type: 'level',
    color: 'from-pink-400 to-rose-500'
  },
  {
    id: 'WEEK_STREAK',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: Flame,
    requirement: 7,
    type: 'streak',
    color: 'from-orange-400 to-red-500'
  },
  {
    id: 'MONTH_STREAK',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: Trophy,
    requirement: 30,
    type: 'streak',
    color: 'from-purple-400 to-indigo-500'
  }
];

export default function AchievementsPage() {
  const { achievements, level, streak, tasks } = useGameStore();
  const completedTasks = tasks.filter(t => t.completed).length;

  const getAchievementProgress = (achievement: typeof ACHIEVEMENTS_DATA[0]) => {
    switch (achievement.type) {
      case 'tasks':
        return Math.min(100, (completedTasks / achievement.requirement) * 100);
      case 'level':
        return Math.min(100, (level / achievement.requirement) * 100);
      case 'streak':
        return Math.min(100, (streak / achievement.requirement) * 100);
      default:
        return 0;
    }
  };

  const getCurrentValue = (achievement: typeof ACHIEVEMENTS_DATA[0]) => {
    switch (achievement.type) {
      case 'tasks':
        return completedTasks;
      case 'level':
        return level;
      case 'streak':
        return streak;
      default:
        return 0;
    }
  };

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS_DATA.length;

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Achievements</h1>
          <p className="text-white/60">Collect them all and show your mastery</p>
        </div>
        <div className="card px-6 py-3 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="text-white" size={24} />
          </div>
          <div>
            <p className="text-white/60 text-sm">Unlocked</p>
            <p className="text-3xl font-bold text-yellow-400">{unlockedCount}/{totalCount}</p>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60">Overall Progress</span>
          <span className="font-bold">{Math.round((unlockedCount / totalCount) * 100)}%</span>
        </div>
        <div className="progress-bar h-3">
          <div 
            className="progress-bar-fill h-3"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {ACHIEVEMENTS_DATA.map((achievement, index) => {
          const Icon = achievement.icon;
          const isUnlocked = achievements.includes(achievement.id);
          const progress = getAchievementProgress(achievement);
          const current = getCurrentValue(achievement);

          return (
            <div
              key={achievement.id}
              className={`card p-5 transition-all duration-300 ${
                isUnlocked 
                  ? 'border-yellow-400/30 shadow-lg shadow-yellow-400/10' 
                  : 'opacity-75'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  isUnlocked 
                    ? `bg-gradient-to-br ${achievement.color}` 
                    : 'bg-white/10'
                }`}>
                  {isUnlocked ? (
                    <Icon className="text-white" size={28} />
                  ) : (
                    <Lock className="text-white/30" size={24} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-lg ${isUnlocked ? '' : 'text-white/50'}`}>
                      {achievement.name}
                    </h3>
                    {isUnlocked && (
                      <Unlock size={16} className="text-yellow-400" />
                    )}
                  </div>
                  <p className={`text-sm mb-3 ${isUnlocked ? 'text-white/60' : 'text-white/40'}`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Progress</span>
                      <span className={isUnlocked ? 'text-yellow-400' : 'text-white/50'}>
                        {current} / {achievement.requirement}
                      </span>
                    </div>
                    <div className="progress-bar h-2">
                      <div 
                        className={`progress-bar-fill h-2 ${
                          isUnlocked ? '' : 'from-gray-500 to-gray-600'
                        }`}
                        style={{ 
                          width: `${progress}%`,
                          background: isUnlocked 
                            ? undefined 
                            : 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.3))'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
