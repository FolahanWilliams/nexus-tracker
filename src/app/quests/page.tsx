'use client';

import { useGameStore, TaskCategory } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';
import { ValidationError } from '@/lib/validation';
import { useState, useEffect } from 'react';
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
  const { tasks, addTask, toggleTask, deleteTask, xp, getSkillMultiplier, equippedItems, lastDroppedItem, clearDroppedItem, characterName, characterClass, level, totalQuestsCompleted, streak } = useGameStore();
  const { addToast } = useToastStore();

  // Show toast when an item drops from the store
  useEffect(() => {
    if (lastDroppedItem) {
      addToast(`Item found! ${lastDroppedItem} added to inventory`, 'success');
      clearDroppedItem();
    }
  }, [lastDroppedItem]);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Epic'>('Medium');
  const [category, setCategory] = useState<TaskCategory>('Other');
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly'>('none');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'All'>('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  const CATEGORIES: TaskCategory[] = ['Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', 'Other'];
  const CATEGORY_COLORS: Record<TaskCategory, string> = {
    Study: 'bg-blue-500/20 text-blue-400',
    Health: 'bg-green-500/20 text-green-400',
    Creative: 'bg-purple-500/20 text-purple-400',
    Work: 'bg-orange-500/20 text-orange-400',
    Social: 'bg-pink-500/20 text-pink-400',
    Personal: 'bg-yellow-500/20 text-yellow-400',
    Other: 'bg-gray-500/20 text-gray-400',
  };

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

  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Quest title cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    setTitleError('');
    
    try {
      await addTask(title, difficulty, undefined, category, recurring);
      addToast('Quest added!', 'success');
      setTitle('');
    } catch (error) {
      if (error instanceof ValidationError) {
        setTitleError(error.message);
        addToast(error.message, 'error');
      } else {
        addToast('Failed to add quest. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = filterCategory === 'All'
    ? tasks
    : tasks.filter(t => (t.category ?? 'Other') === filterCategory);

  const handleGenerateQuests = async () => {
    if (!generatePrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatePrompt,
          context: { name: characterName, characterClass, level, totalQuestsCompleted, streak }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast('Failed to generate quests. Please try again.', 'error');
        return;
      }

      if (data.quests && Array.isArray(data.quests)) {
        data.quests.forEach((quest: GeneratedQuest) => {
          addTask(quest.title, quest.difficulty, quest.xp);
        });
        const count = data.quests.length;
        const note = data.isMock ? ' (fallback quests)' : '';
        addToast(`${count} quest${count !== 1 ? 's' : ''} generated${note}!`, 'success');
      }

      setGeneratePrompt('');
    } catch (error) {
      console.error('Failed to generate quests:', error);
      addToast('Network error. Check your connection and try again.', 'error');
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

          <form onSubmit={handleAddTask} className="space-y-4" noValidate>
            <div>
              <label htmlFor="quest-title" className="sr-only">Quest title</label>
              <input
                id="quest-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError('');
                }}
                placeholder="e.g., Practice Spanish for 30 minutes"
                className={`input-field ${titleError ? 'border-red-500 focus:border-red-500' : ''}`}
                aria-label="Quest title"
                aria-invalid={!!titleError}
                aria-describedby={titleError ? 'title-error' : undefined}
                maxLength={200}
                disabled={isSubmitting}
              />
              {titleError && (
                <p id="title-error" className="mt-1 text-sm text-red-500" role="alert">
                  {titleError}
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2 font-semibold uppercase tracking-wide">Difficulty</p>
              <div className="grid grid-cols-4 gap-2">
                {(['Easy', 'Medium', 'Hard', 'Epic'] as const).map((diff) => (
                  <motion.button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    aria-pressed={difficulty === diff}
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
            </div>

            {/* Category */}
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2 font-semibold uppercase tracking-wide">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    aria-pressed={category === cat}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-2 ${
                      category === cat
                        ? 'border-[var(--color-purple)] ' + CATEGORY_COLORS[cat]
                        : 'border-[var(--color-border)] bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] hover:border-[var(--color-purple)]'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Recurring */}
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2 font-semibold uppercase tracking-wide">Repeat</p>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'daily', 'weekly'] as const).map((r) => (
                  <motion.button
                    key={r}
                    type="button"
                    onClick={() => setRecurring(r)}
                    aria-pressed={recurring === r}
                    className={`py-2 rounded text-sm font-semibold transition-all ${
                      recurring === r
                        ? 'bg-[var(--color-purple)] text-white'
                        : 'bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-purple)]'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </motion.button>
                ))}
              </div>
            </div>
            
            <motion.button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="rpg-button w-full !bg-[var(--color-purple)] !text-white hover:!bg-[var(--color-purple-light)] disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Add Quest
                </>
              )}
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
            <label htmlFor="ai-prompt" className="sr-only">Describe what you want to achieve</label>
            <input
              id="ai-prompt"
              type="text"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="e.g., Learn to play guitar"
              className="input-field"
              aria-label="AI quest generation prompt"
              maxLength={500}
              disabled={isGenerating}
            />
            <motion.button 
              onClick={handleGenerateQuests}
              disabled={isGenerating || !generatePrompt.trim()}
              className="rpg-button w-full !bg-[var(--color-purple)] !text-white hover:!bg-[var(--color-purple-light)] disabled:opacity-50"
              whileHover={{ scale: isGenerating ? 1 : 1.02 }}
              whileTap={{ scale: isGenerating ? 1 : 0.98 }}
              aria-busy={isGenerating}
            >
              <Sparkles size={20} />
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">✨</span>
                  Generating...
                </>
              ) : (
                'Generate Quests'
              )}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Your Quests</h2>
            <span className="text-sm text-[var(--color-text-muted)]">{filteredTasks.length} quest{filteredTasks.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['All', ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                aria-pressed={filterCategory === cat}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  filterCategory === cat
                    ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/20 text-[var(--color-purple)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-purple)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-secondary)] font-semibold">No quests yet!</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Create your first quest above or use the AI generator!</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              No {filterCategory} quests yet. Change category or add one above.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredTasks.map((task, index) => (
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
                          // Calculate bonuses for display
                          const xpBonus = Math.floor(task.xpReward * (xpMultiplier - 1)) + getEquipmentBonus('xpBonus');
                          const goldBonus = Math.floor((task.xpReward / 2) * (goldMultiplier - 1)) + getEquipmentBonus('goldBonus');

                          // toggleTask handles XP, gold, drops, streak, achievements
                          toggleTask(task.id);

                          // Trigger floating XP number
                          const totalXP = task.xpReward + xpBonus;
                          triggerXPFloat(`+${totalXP} XP`, '#4ade80');
                          if (goldBonus > 0 || task.xpReward > 0) {
                            const gold = Math.floor(task.xpReward / 2) + goldBonus;
                            setTimeout(() => triggerXPFloat(`+${gold} 🪙`, '#fbbf24'), 200);
                          }

                          let message = `Quest completed! +${task.xpReward} XP, +${Math.floor(task.xpReward / 2)} Gold`;
                          if (xpBonus > 0 || goldBonus > 0) {
                            message += ` (Bonuses: +${xpBonus} XP, +${goldBonus} Gold)`;
                          }

                          addToast(message, 'success');
                        } else {
                          toggleTask(task.id);
                          addToast('Quest uncompleted', 'info');
                        }
                      }}
                      className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-green)] focus:ring-offset-2 ${
                        task.completed
                          ? 'bg-[var(--color-green)] text-white'
                          : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-green)] hover:text-white'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Complete "${task.title}"`}
                      aria-pressed={task.completed}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          (e.target as HTMLButtonElement).click();
                        }
                      }}
                    >
                      <Check size={20} />
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${task.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`rpg-badge ${difficultyColors[task.difficulty]}`}>
                          {task.difficulty}
                        </span>
                        <span className={`rpg-badge ${CATEGORY_COLORS[task.category ?? 'Other']}`}>
                          {task.category ?? 'Other'}
                        </span>
                        {task.recurring && task.recurring !== 'none' && (
                          <span className="rpg-badge bg-[var(--color-purple)]/20 text-[var(--color-purple)]">
                            🔁 {task.recurring}
                          </span>
                        )}
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
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-red)] focus:ring-offset-2 rounded"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`Delete "${task.title}"`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          (e.target as HTMLButtonElement).click();
                        }
                      }}
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
