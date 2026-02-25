'use client';

import { useGameStore, BossBattle } from '@/store/useGameStore';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getPulseDataForRoute } from '@/hooks/useNexusPulse';
import {
  ChevronLeft,
  Sword,
  Zap,
  Trophy,
  Skull,
  Timer,
  Play,
  X
} from 'lucide-react';
import { useToastStore } from '@/components/ToastContainer';

const BOSS_TEMPLATES: { name: string; description: string; difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'; hp: number; xpReward: number; goldReward: number; timeLimit: number; emoji: string }[] = [
  { name: 'Procrastination Demon', description: 'The spirit that delays your tasks', difficulty: 'Medium', hp: 100, xpReward: 150, goldReward: 75, timeLimit: 300, emoji: '👿' },
  { name: 'Distraction Dragon', description: 'A dragon that breathes fire of interruption', difficulty: 'Hard', hp: 250, xpReward: 350, goldReward: 200, timeLimit: 420, emoji: '🐉' },
  { name: 'Laziness Giant', description: 'A giant that makes you want to rest', difficulty: 'Medium', hp: 150, xpReward: 200, goldReward: 100, timeLimit: 300, emoji: '🦣' },
  { name: 'Doubt Wraith', description: 'A spirit that makes you question yourself', difficulty: 'Hard', hp: 200, xpReward: 300, goldReward: 175, timeLimit: 420, emoji: '👻' },
  { name: 'Chaos Phoenix', description: 'A mythical beast of disorder', difficulty: 'Epic', hp: 500, xpReward: 750, goldReward: 500, timeLimit: 600, emoji: '🔥' },
];

// Difficulty-based attack power ranges
const ATTACK_RANGES: Record<string, { min: number; max: number }> = {
  Easy: { min: 5, max: 30 },
  Medium: { min: 5, max: 40 },
  Hard: { min: 10, max: 60 },
  Epic: { min: 15, max: 80 },
};

const DIFFICULTY_COLORS = {
  'Easy': 'text-[var(--color-green)]',
  'Medium': 'text-[var(--color-blue)]',
  'Hard': 'text-[var(--color-orange)]',
  'Epic': 'text-[var(--color-purple)]'
};

const DIFFICULTY_BG = {
  'Easy': 'bg-[var(--color-green)]',
  'Medium': 'bg-[var(--color-blue)]',
  'Hard': 'bg-[var(--color-orange)]',
  'Epic': 'bg-[var(--color-purple)]'
};

export default function BossBattlesPage() {
  const { bossBattles, startBossBattle, damageBoss, failBossBattle, checkDailyQuests } = useGameStore();
  const { addToast } = useToastStore();
  const [showBossSelect, setShowBossSelect] = useState(false);
  const [selectedBoss, setSelectedBoss] = useState<BossBattle | null>(null);
  const [battleTimer, setBattleTimer] = useState(0);
  const [playerDamage, setPlayerDamage] = useState(10);

  const activeBosses = bossBattles.filter(b => !b.completed && !b.failed);
  const completedBosses = bossBattles.filter(b => b.completed);
  const failedBosses = bossBattles.filter(b => b.failed);
  const [isGeneratingBoss, setIsGeneratingBoss] = useState(false);

  // Get the time limit for the currently selected boss
  const activeBossTemplate = selectedBoss
    ? BOSS_TEMPLATES.find(t => t.name === selectedBoss.name)
    : null;
  const attackRange = activeBossTemplate ? ATTACK_RANGES[activeBossTemplate.difficulty] : { min: 5, max: 50 };

  useEffect(() => {
    checkDailyQuests();
  }, []);

  useEffect(() => {
    if (selectedBoss) {
      const bossTemplate = BOSS_TEMPLATES.find(t => t.name === selectedBoss.name);
      const limit = bossTemplate?.timeLimit ?? 300;
      const timer = setInterval(() => {
        setBattleTimer(prev => {
          if (prev >= limit) {
            failBossBattle(selectedBoss.id);
            addToast('Boss battle timed out! Defeat next time.', 'error');
            setSelectedBoss(null);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedBoss]);

  const handleStartBattle = (template: typeof BOSS_TEMPLATES[0]) => {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (template.timeLimit ?? 300));

    startBossBattle({
      name: template.name,
      description: template.description,
      difficulty: template.difficulty,
      hp: template.hp,
      maxHp: template.hp,
      xpReward: template.xpReward,
      goldReward: template.goldReward,
      expiresAt: expiresAt.toISOString()
    });

    setShowBossSelect(false);
    addToast(`Boss battle started: ${template.name}!`, 'success');
  };

  const handleGenerateBoss = async () => {
    setIsGeneratingBoss(true);
    try {
      const { tasks, habits, level } = useGameStore.getState();
      const uncompletedTasks = tasks.filter(t => !t.completed).slice(0, 10);
      const failedHabits = habits.filter(h => h.completedDates.length === 0 || !h.completedDates.includes(new Date().toISOString().split('T')[0]));

      const response = await fetch('/api/generate-boss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uncompletedTasks,
          failedHabits,
          playerContext: { level },
          pulseData: getPulseDataForRoute()
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();

      if (data.name) {
        startBossBattle({
          name: data.name,
          description: data.description,
          difficulty: data.difficulty as 'Easy' | 'Medium' | 'Hard' | 'Epic',
          hp: data.hp,
          maxHp: data.maxHp,
          xpReward: data.xpReward,
          goldReward: data.goldReward,
          expiresAt: data.expiresAt
        });
        addToast(`Vanquish the ${data.name}!`, 'success');
      }
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'TimeoutError'
        ? 'Boss summoning timed out. Try again.' : 'Failed to summon boss. The arcane energies fizzled.';
      addToast(msg, 'error');
    }
    setIsGeneratingBoss(false);
  };

  const handleAttack = () => {
    if (!selectedBoss) return;

    damageBoss(selectedBoss.id, playerDamage);

    // Get fresh boss data after damage
    const { bossBattles: updatedBosses } = useGameStore.getState();
    const updatedBoss = updatedBosses.find(b => b.id === selectedBoss.id);

    if (updatedBoss) {
      if (updatedBoss.hp <= 0 || updatedBoss.completed) {
        addToast(`Boss defeated! +${selectedBoss.xpReward} XP, +${selectedBoss.goldReward} Gold`, 'success');
        setSelectedBoss(null);
        setBattleTimer(0);
      } else {
        setSelectedBoss(updatedBoss);
        addToast(`Dealt ${playerDamage} damage! ${updatedBoss.hp} HP remaining.`, 'info');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <Sword className="text-[var(--color-red)]" />
              Boss Battles
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateBoss}
              disabled={isGeneratingBoss}
              className="rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50"
            >
              <Zap size={18} className={isGeneratingBoss ? "animate-pulse" : ""} />
              {isGeneratingBoss ? "Summoning..." : "AI Summon"}
            </button>
            <button
              onClick={() => setShowBossSelect(true)}
              className="rpg-button !bg-[var(--color-red)] !text-white"
            >
              <Play size={18} />
              Start Battle
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-red)]">{activeBosses.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Active Battles</p>
          </div>
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-green)]">{completedBosses.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Victories</p>
          </div>
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-yellow)]">{failedBosses.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Defeats</p>
          </div>
        </motion.div>

        {/* Active Boss Battles */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Skull size={20} className="text-[var(--color-red)]" />
          Active Battles
        </h2>

        {activeBosses.length === 0 ? (
          <motion.div
            className="rpg-card text-center py-12 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Sword size={48} className="mx-auto mb-4 opacity-30 text-[var(--color-red)]" />
            <p className="text-[var(--color-text-secondary)] font-semibold">No active boss battles</p>
            <p className="text-sm text-[var(--color-text-muted)]">Start a boss battle to earn big rewards!</p>
          </motion.div>
        ) : (
          <div className="space-y-4 mb-8">
            {activeBosses.map((boss) => (
              <motion.div
                key={boss.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rpg-card !border-[var(--color-red)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{boss.name}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">{boss.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-xs font-bold ${DIFFICULTY_COLORS[boss.difficulty]}`}>
                        {boss.difficulty}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Timer size={12} />
                        {formatTime(battleTimer)} / {formatTime(BOSS_TEMPLATES.find(t => t.name === boss.name)?.timeLimit ?? 300)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBoss(boss);
                      setBattleTimer(0);
                    }}
                    className="rpg-button !bg-[var(--color-red)] !text-white"
                  >
                    <Sword size={16} />
                    Fight
                  </button>
                </div>

                {/* HP Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--color-red)]">HP</span>
                    <span>{boss.hp} / {boss.maxHp}</span>
                  </div>
                  <div className="h-4 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${DIFFICULTY_BG[boss.difficulty]} rounded-full`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <span className="text-[var(--color-green)]">+{boss.xpReward} XP</span>
                  <span className="text-[var(--color-yellow)]">+{boss.goldReward} Gold</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Completed Battles */}
        {completedBosses.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy size={20} className="text-[var(--color-yellow)]" />
              Victory Log
            </h2>
            <div className="space-y-3 mb-8">
              {completedBosses.map((boss) => (
                <motion.div
                  key={boss.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rpg-card opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--color-green)] rounded-full flex items-center justify-center">
                      <Trophy size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{boss.name}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {boss.difficulty} Boss Defeated
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-[var(--color-green)]">+{boss.xpReward} XP</p>
                      <p className="text-[var(--color-yellow)]">+{boss.goldReward} Gold</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Boss Selection Modal */}
      <AnimatePresence>
        {showBossSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBossSelect(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[var(--color-border)]">
                <h2 className="text-xl font-bold">Select Your Opponent</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Choose a boss to battle</p>
              </div>

              <div className="p-6 space-y-4">
                {BOSS_TEMPLATES.map((boss) => (
                  <motion.div
                    key={boss.name}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-[var(--color-bg-dark)] rounded-lg border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-red)]"
                    onClick={() => handleStartBattle(boss)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-3xl">{boss.emoji}</span>
                        <div>
                          <h3 className="font-bold">{boss.name}</h3>
                          <p className="text-sm text-[var(--color-text-secondary)]">{boss.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs font-bold ${DIFFICULTY_COLORS[boss.difficulty]}`}>
                              {boss.difficulty}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">{boss.hp} HP</span>
                            <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                              <Timer size={10} />
                              {formatTime(boss.timeLimit)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm flex-shrink-0">
                        <p className="text-[var(--color-green)]">+{boss.xpReward} XP</p>
                        <p className="text-[var(--color-yellow)]">+{boss.goldReward} Gold</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Modal */}
      <AnimatePresence>
        {selectedBoss && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="rpg-card max-w-md w-full text-center"
            >
              <button
                onClick={() => {
                  setSelectedBoss(null);
                  setBattleTimer(0);
                }}
                className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white"
              >
                <X size={24} />
              </button>

              <div className="mb-6">
                <Skull size={64} className="mx-auto text-[var(--color-red)] mb-4" />
                <h2 className="text-2xl font-bold">{selectedBoss.name}</h2>
                <p className="text-[var(--color-text-secondary)]">{selectedBoss.difficulty}</p>
              </div>

              {/* Timer */}
              <div className="mb-6 flex items-center justify-center gap-2 text-[var(--color-text-muted)]">
                <Timer size={20} />
                <span className="text-xl font-bold">{formatTime(battleTimer)}</span>
              </div>

              {/* HP Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--color-red)]">HP</span>
                  <span>{selectedBoss.hp} / {selectedBoss.maxHp}</span>
                </div>
                <div className="h-6 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${DIFFICULTY_BG[selectedBoss.difficulty]} rounded-full`}
                    animate={{ width: `${(selectedBoss.hp / selectedBoss.maxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Damage Control */}
              <div className="mb-6">
                <label className="text-sm text-[var(--color-text-secondary)] mb-2 block">
                  Attack Power <span className="text-xs text-[var(--color-text-muted)]">({attackRange.min}–{attackRange.max})</span>
                </label>
                <input
                  type="range"
                  min={attackRange.min}
                  max={attackRange.max}
                  value={playerDamage}
                  onChange={(e) => setPlayerDamage(Number(e.target.value))}
                  className="w-full"
                  aria-label="Attack power"
                />
                <p className="text-lg font-bold text-[var(--color-red)]">{playerDamage} Damage</p>
              </div>

              {/* Attack Button — disabled once the boss is already defeated or failed
                  so the button can't fire no-op store calls while the modal is still
                  open (e.g. when the boss timer expires mid-fight). */}
              <motion.button
                onClick={handleAttack}
                disabled={!selectedBoss || selectedBoss.completed || selectedBoss.failed}
                className="w-full rpg-button !bg-[var(--color-red)] !text-white !py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={selectedBoss && !selectedBoss.completed && !selectedBoss.failed ? { scale: 1.05 } : {}}
                whileTap={selectedBoss && !selectedBoss.completed && !selectedBoss.failed ? { scale: 0.95 } : {}}
              >
                <Sword size={24} className="inline mr-2" />
                ATTACK!
              </motion.button>

              {/* Rewards Preview */}
              <div className="mt-6 flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-[var(--color-green)] font-bold">+{selectedBoss.xpReward} XP</p>
                </div>
                <div>
                  <p className="text-[var(--color-yellow)] font-bold">+{selectedBoss.goldReward} Gold</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
