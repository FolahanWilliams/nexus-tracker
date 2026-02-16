'use client';

import Link from 'next/link';
import { useGameStore } from '@/store/useGameStore';
import { useState, useEffect } from 'react';
import { Gamepad2, Flame, Gift, Sparkles, Sword, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToastStore } from '@/components/ToastContainer';

const menuItems = [
  { href: '/quests', emoji: '📦', label: 'QUESTS' },
  { href: '/chains', emoji: '🗺️', label: 'QUEST CHAINS' },
  { href: '/bosses', emoji: '⚔️', label: 'BOSS BATTLES' },
  { href: '/character', emoji: '⚔️', label: 'CHARACTER' },
  { href: '/inventory', emoji: '🎒', label: 'INVENTORY' },
  { href: '/skills', emoji: '🧠', label: 'SKILL TREE' },
  { href: '/crafting', emoji: '🔨', label: 'CRAFTING' },
  { href: '/auction', emoji: '🏪', label: 'AUCTION' },
  { href: '/shop', emoji: '💎', label: 'SHOP' },
  { href: '/analytics', emoji: '🏛️', label: 'ANALYTICS' },
  { href: '/achievements', emoji: '🏆', label: 'ACHIEVEMENTS' },
  { href: '/leaderboard', emoji: '👑', label: 'LEADERBOARD' },
  { href: '/settings', emoji: '⚙️', label: 'SETTINGS' },
];

const getRemainingMinutes = (expiresAt: string): number => {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000);
};

export default function HomePage() {
  const { 
    level, xp, gold, gems, streak, title, 
    dailyQuests, checkDailyQuests, generateDailyQuests,
    claimDailyReward, lastDailyRewardClaim, loginStreak,
    addTask, totalQuestsCompleted, checkBuffs, activeBuffs
  } = useGameStore();
  const { addToast } = useToastStore();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    checkDailyQuests();
    checkBuffs();
    
    // Auto-claim daily reward if not claimed today
    const today = new Date().toISOString().split('T')[0];
    if (lastDailyRewardClaim !== today) {
      // Show claim button instead
    }
  }, []);

  const handleClaimDailyReward = () => {
    const today = new Date().toISOString().split('T')[0];
    if (lastDailyRewardClaim === today) {
      addToast('Daily reward already claimed! Come back tomorrow.', 'info');
      return;
    }
    claimDailyReward();
    
    const reward = DAILY_REWARDS[(loginStreak % 7)];
    addToast(`Daily reward claimed! +${reward.gold} Gold, +${reward.gems} Gems`, 'success');
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Generate a daily productivity plan with 3-5 tasks'
        })
      });
      
      const data = await response.json();
      
      if (data.tasks && Array.isArray(data.tasks)) {
        data.tasks.forEach((task: string, index: number) => {
          const difficulty = ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)] as 'Easy' | 'Medium' | 'Hard';
          addTask(task, difficulty);
        });
        addToast(`Generated ${data.tasks.length} AI-powered tasks!`, 'success');
      }
    } catch (error) {
      addToast('Failed to generate plan. Please try again.', 'error');
    }
    setIsGeneratingPlan(false);
  };

  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpProgress = (xp / xpForNextLevel) * 100;

  const completedDailyQuests = dailyQuests.filter(q => q.completed).length;
  const canClaimDaily = lastDailyRewardClaim !== new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Banner */}
      <motion.div 
        className="relative w-full h-48 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src="https://pixabay.com/get/gf51f6ee744734e160ebff49d36ebcb591c1184e14a1cf0341cc1a9ecbc4747ac633989e6062c57bac2383b7deb9cd2d5.png"
          alt="Pixel art fantasy landscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-dark)]" />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 -mt-12 relative z-10">
        <div className="max-w-3xl mx-auto px-4 pb-12">
          {/* Stats Bar */}
          <motion.div 
            className="rpg-card mb-6 -mt-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] rounded-full flex items-center justify-center text-2xl font-bold">
                  {level}
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Level</p>
                  <p className="font-bold">{title}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-[var(--color-yellow)]">{gold}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Gold</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[var(--color-blue)]">{gems}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Gems</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[var(--color-orange)]">{streak}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Streak</p>
                </div>
              </div>
            </div>
            
            {/* XP Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>XP Progress</span>
                <span>{xp} / {xpForNextLevel}</span>
              </div>
              <div className="h-3 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Daily Section */}
          <motion.div 
            className="grid grid-cols-2 gap-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Daily Quests */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="text-[var(--color-green)]" size={20} />
                <h3 className="font-bold">Daily Quests</h3>
                <span className="text-xs text-[var(--color-text-muted)]">
                  ({completedDailyQuests}/{dailyQuests.length})
                </span>
              </div>
              <div className="space-y-2">
                {dailyQuests.slice(0, 3).map((quest) => (
                  <div key={quest.id} className="flex items-center gap-2 text-sm">
                    <span className={quest.completed ? 'text-[var(--color-green)]' : 'text-[var(--color-text-muted)]'}>
                      {quest.completed ? '✓' : '○'}
                    </span>
                    <span className={quest.completed ? 'line-through' : ''}>
                      {quest.title}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/quests" className="text-xs text-[var(--color-purple)] mt-3 block">
                View all →
              </Link>
            </div>

            {/* Daily Login */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="text-[var(--color-yellow)]" size={20} />
                <h3 className="font-bold">Daily Login</h3>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Day {loginStreak + 1}
                </span>
              </div>
              
              {canClaimDaily ? (
                <button
                  onClick={handleClaimDailyReward}
                  className="w-full rpg-button !bg-[var(--color-yellow)] !text-black !py-2"
                >
                  <Gift size={16} />
                  Claim Reward!
                </button>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Come back tomorrow!
                </p>
              )}
              
              <div className="flex justify-center gap-1 mt-2">
                {[1,2,3,4,5,6,7].map(day => (
                  <div 
                    key={day}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
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
                  <Sparkles className="text-[var(--color-purple)]" />
                  AI Plan Generator
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Let AI create your daily quest plan
                </p>
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                className="rpg-button !bg-[var(--color-purple)] !text-white"
              >
                {isGeneratingPlan ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Zap size={16} />
                    Generate Plan
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Active Buffs */}
          {activeBuffs.length > 0 && (
            <motion.div 
              className="rpg-card mb-6 !border-[var(--color-green)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Flame className="text-[var(--color-green)]" />
                Active Buffs
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeBuffs.map((buff, index) => {
                  const remainingMinutes = getRemainingMinutes(buff.expiresAt);
                  return (
                    <span 
                      key={index}
                      className="text-xs px-2 py-1 bg-[var(--color-green)]/20 text-[var(--color-green)] rounded"
                    >
                      {buff.type} x{buff.value} ({remainingMinutes}m)
                    </span>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Menu Items */}
          <div className="space-y-3">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05, duration: 0.4 }}
              >
                <Link href={item.href} className="menu-item">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[var(--color-text-muted)]">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DAILY_REWARDS = [
  { day: 1, gold: 50, gems: 5 },
  { day: 2, gold: 75, gems: 5 },
  { day: 3, gold: 100, gems: 10 },
  { day: 4, gold: 125, gems: 10 },
  { day: 5, gold: 150, gems: 15 },
  { day: 6, gold: 175, gems: 20 },
  { day: 7, gold: 250, gems: 50 },
];
