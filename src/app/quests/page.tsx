'use client';

import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Check, 
  Trash2, 
  Sparkles,
  ChevronLeft,
  Zap,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeneratedQuest {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
  xp: number;
}

export default function QuestsPage() {
  const { tasks, addTask, toggleTask, deleteTask, xp, getSkillMultiplier, equippedItems, addItem } = useGameStore();
  const { addToast } = useToastStore();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Epic'>('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  // Calculate total multipliers from skills and equipment
  const xpMultiplier = getSkillMultiplier('xp');
  const goldMultiplier = getSkillMultiplier('gold');
  
  // Add equipment bonuses
  const getEquipmentBonus = (type: 'xpBonus' | 'goldBonus') => {
    let bonus = 0;
    Object.values(equippedItems).forEach(item => {
      if (item?.stats?.[type]) {
        bonus += item.stats[type] || 0;
      }
    });
    return bonus;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title, difficulty);
    addToast('Quest added!', 'success');
    setTitle('');
  };

  const handleGenerateQuests = async () => {
    if (!generatePrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatePrompt }),
      });

      const data = await response.json();
      
      if (data.quests && Array.isArray(data.quests)) {
        data.quests.forEach((quest: GeneratedQuest) => {
          addTask(quest.title, quest.difficulty, quest.xp);
        });
      }

      setGeneratePrompt('');
    } catch (error) {
      console.error('Failed to generate quests:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyColors = {
    Easy: 'bg-[var(--color-badge-green)]/20 text-[var(--color-badge-green)]',
    Medium: 'bg-[var(--color-badge-blue)]/20 text-[var(--color-badge-blue)]',
    Hard: 'bg-[var(--color-badge-yellow)]/20 text-[var(--color-badge-yellow)]',
    Epic: 'bg-[var(--color-badge-purple)]/20 text-[var(--color-badge-purple)]',
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold">Quests</h1>
          </div>
          <motion.div 
            className="flex items-center gap-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <span className="text-[var(--color-purple)]">⚡</span>
            <span className="font-bold">{xp} XP</span>
          </motion.div>
        </div>
      </div>

      {/* Active Bonuses Bar */}
      {(xpMultiplier > 1 || goldMultiplier > 1 || getEquipmentBonus('xpBonus') > 0 || getEquipmentBonus('goldBonus') > 0) && (
        <motion.div 
          className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-4 text-sm">
            <span className="text-[var(--color-text-muted)]">Active Bonuses:</span>
            {xpMultiplier > 1 && (
              <span className="text-[var(--color-green)] flex items-center gap-1">
                <Zap size={14} /> x{xpMultiplier.toFixed(1)} XP
              </span>
            )}
            {goldMultiplier > 1 && (
              <span className="text-[var(--color-yellow)] flex items-center gap-1">
                <Coins size={14} /> x{goldMultiplier.toFixed(1)} Gold
              </span>
            )}
            {getEquipmentBonus('xpBonus') > 0 && (
              <span className="text-[var(--color-green)]">
                +{getEquipmentBonus('xpBonus')} XP (Equipment)
              </span>
            )}
            {getEquipmentBonus('goldBonus') > 0 && (
              <span className="text-[var(--color-yellow)]">
                +{getEquipmentBonus('goldBonus')} Gold (Equipment)
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Add Quest Form */}
        <motion.div 
          className="rpg-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-bold mb-4">Create New Quest</h2>
          
          <form onSubmit={handleAddTask} className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Practice Spanish for 30 minutes"
              className="input-field"
            />
            
            <div className="grid grid-cols-4 gap-2">
              {(['Easy', 'Medium', 'Hard', 'Epic'] as const).map((diff) => (
                <motion.button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`py-2.5 px-4 rounded font-semibold text-sm transition-all ${
                    difficulty === diff
                      ? 'bg-[var(--color-purple)] text-white border-2 border-[var(--color-purple)]'
                      : 'bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] border-2 border-[var(--color-border)] hover:border-[var(--color-purple)]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {diff}
                </motion.button>
              ))}
            </div>
            
            <motion.button
              type="submit"
              disabled={!title.trim()}
              className="rpg-button w-full !bg-[var(--color-purple)] !text-white hover:!bg-[var(--color-purple-light)] disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={20} />
              Add Quest
            </motion.button>
          </form>
        </motion.div>

        {/* AI Quest Generator */}
        <motion.div 
          className="rpg-card mb-8 border-[var(--color-purple)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div 
              className="w-12 h-12 bg-[var(--color-purple)] rounded-lg flex items-center justify-center"
              animate={{ rotate: [0, 5, 0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Sparkles className="text-white" size={24} />
            </motion.div>
            <div>
              <p className="font-bold">AI Quest Generator</p>
              <p className="text-sm text-[var(--color-text-secondary)]">Let AI create quests for you!</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="e.g., Learn to play guitar"
              className="input-field"
            />
            <motion.button 
              onClick={handleGenerateQuests}
              disabled={isGenerating || !generatePrompt.trim()}
              className="rpg-button w-full !bg-[var(--color-purple)] !text-white hover:!bg-[var(--color-purple-light)] disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={20} />
              {isGenerating ? 'Generating...' : 'Generate Quests'}
            </motion.button>
          </div>
        </motion.div>

        {/* Quest List */}
        <motion.div 
          className="rpg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold mb-4">Your Quests</h2>
          
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-secondary)] font-semibold">No quests yet!</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Add your first quest above</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    className={`flex items-center gap-4 p-4 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded transition-all hover:border-[var(--color-purple)] ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <motion.button
                      onClick={() => {
                        if (!task.completed) {
                          // Calculate bonuses
                          const xpBonus = Math.floor(task.xpReward * (xpMultiplier - 1)) + getEquipmentBonus('xpBonus');
                          const goldBonus = Math.floor((task.xpReward / 2) * (goldMultiplier - 1)) + getEquipmentBonus('goldBonus');
                          
                          toggleTask(task.id);
                          
                          let message = `Quest completed! +${task.xpReward} XP, +${Math.floor(task.xpReward / 2)} Gold`;
                          if (xpBonus > 0 || goldBonus > 0) {
                            message += ` (Bonuses: +${xpBonus} XP, +${goldBonus} Gold)`;
                          }
                          
                          // Random item drop check
                          if (Math.random() < 0.15) {
                            const dropItems = [
                              { name: 'Health Potion', description: 'Restores health', type: 'consumable' as const, rarity: 'Common' as const, icon: '🧪' },
                              { name: 'Gold Coin', description: 'A shiny gold coin', type: 'material' as const, rarity: 'Common' as const, icon: '🪙' },
                              { name: 'XP Scroll', description: 'Grants bonus XP', type: 'consumable' as const, rarity: 'Uncommon' as const, icon: '📜' },
                              { name: 'Mystery Gem', description: 'A mysterious gem', type: 'material' as const, rarity: 'Rare' as const, icon: '💎' },
                            ];
                            const drop = dropItems[Math.floor(Math.random() * dropItems.length)];
                            addItem({
                              name: drop.name,
                              description: drop.description,
                              type: drop.type,
                              rarity: drop.rarity,
                              icon: drop.icon,
                              quantity: 1,
                              stats: drop.rarity === 'Uncommon' ? { xpBonus: 10 } : drop.rarity === 'Rare' ? { xpBonus: 25, goldBonus: 10 } : undefined
                            });
                            message += ` ${drop.icon} ${drop.name} found!`;
                          }
                          
                          addToast(message, 'success');
                        } else {
                          toggleTask(task.id);
                          addToast('Quest uncompleted', 'info');
                        }
                      }}
                      className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                        task.completed
                          ? 'bg-[var(--color-green)] text-white'
                          : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-green)] hover:text-white'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Check size={20} />
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${task.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`rpg-badge ${difficultyColors[task.difficulty]}`}>
                          {task.difficulty}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] font-semibold">
                          +{task.xpReward} XP
                        </span>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => {
                        deleteTask(task.id);
                        addToast('Quest deleted', 'info');
                      }}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors flex-shrink-0"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 size={20} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
