'use client';

import { useGameStore, QuestChain, QuestStep, StepBranch } from '@/store/useGameStore';
import { useState } from 'react';
import { useToastStore } from '@/components/ToastContainer';
import {
  Map,
  Check,
  ChevronLeft,
  Plus,
  Lock,
  Trophy,
  Target,
  Zap,
  Coins,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const DIFFICULTY_COLORS = {
  'Easy': 'text-[var(--color-green)]',
  'Medium': 'text-[var(--color-blue)]',
  'Hard': 'text-[var(--color-orange)]',
  'Epic': 'text-[var(--color-purple)]'
};

export default function QuestChainsPage() {
  const { questChains, addQuestChain, completeQuestStep, chooseBranch } = useGameStore();
  const { addToast } = useToastStore();
  const [selectedChain, setSelectedChain] = useState<QuestChain | null>(null);
  const [showAddChain, setShowAddChain] = useState(false);

  // New chain form
  const [newChainName, setNewChainName] = useState('');
  const [newChainDesc, setNewChainDesc] = useState('');
  const [newChainDifficulty, setNewChainDifficulty] = useState<QuestChain['difficulty']>('Easy');
  const [newChainItem, setNewChainItem] = useState('');
  const [steps, setSteps] = useState<{
    title: string;
    description: string;
    hasBranches: boolean;
    branches: { label: string; description: string; xpBonus: number }[];
  }[]>([{ title: '', description: '', hasBranches: false, branches: [{ label: '', description: '', xpBonus: 25 }, { label: '', description: '', xpBonus: 25 }] }]);

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  const ITEM_REWARDS = [
    { id: '', name: 'No Item' },
    { id: 'health-potion', name: 'Health Potion' },
    { id: 'mana-potion', name: 'Mana Potion' },
    { id: 'gold-pouch', name: 'Gold Pouch' },
    { id: 'xp-scroll', name: 'XP Scroll' },
    { id: 'mystery-box', name: 'Mystery Box' },
  ];

  const handleAddStep = () => {
    setSteps([...steps, { title: '', description: '', hasBranches: false, branches: [{ label: '', description: '', xpBonus: 25 }, { label: '', description: '', xpBonus: 25 }] }]);
  };

  const handleStepChange = (index: number, field: 'title' | 'description', value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleToggleBranches = (stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].hasBranches = !newSteps[stepIndex].hasBranches;
    setSteps(newSteps);
  };

  const handleBranchChange = (stepIndex: number, branchIndex: number, field: 'label' | 'description' | 'xpBonus', value: string | number) => {
    const newSteps = [...steps];
    (newSteps[stepIndex].branches[branchIndex] as Record<string, string | number>)[field] = value;
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleGenerateChain = async () => {
    if (!generatePrompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatePrompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setNewChainName(data.name || '');
      setNewChainDesc(data.description || '');
      setNewChainDifficulty(data.difficulty || 'Medium');
      setNewChainItem('');

      if (data.steps && Array.isArray(data.steps)) {
        setSteps(data.steps.map((s: { title: string; description: string }) => ({
          title: s.title || '',
          description: s.description || ''
        })));
      }

      addToast('AI Quest Chain generated! Review and create.', 'success');
      setGeneratePrompt('');
    } catch (error) {
      console.error('Failed to generate chain:', error);
      addToast('Failed to generate chain. Try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateChain = () => {
    if (!newChainName.trim() || steps.length === 0 || steps.some(s => !s.title.trim())) return;

    const xpReward = {
      'Easy': 50,
      'Medium': 150,
      'Hard': 300,
      'Epic': 750
    }[newChainDifficulty];

    const goldReward = {
      'Easy': 25,
      'Medium': 75,
      'Hard': 150,
      'Epic': 375
    }[newChainDifficulty];

    const itemReward = newChainItem ? {
      id: `chain-${Date.now()}`,
      name: ITEM_REWARDS.find(i => i.id === newChainItem)?.name || 'Unknown',
      description: 'Quest chain reward',
      type: 'material' as const,
      rarity: 'Rare' as const,
      icon: '🎁',
      quantity: 1
    } : undefined;

    addQuestChain({
      name: newChainName,
      description: newChainDesc,
      difficulty: newChainDifficulty,
      steps: steps.map(s => ({
        ...s,
        branches: s.hasBranches
          ? s.branches
              .filter(b => b.label.trim())
              .map(b => ({ ...b, id: crypto.randomUUID(), xpBonus: Number(b.xpBonus) || 25 }))
          : undefined,
      })) as unknown as QuestStep[],
      reward: {
        xp: xpReward,
        gold: goldReward,
        item: itemReward
      }
    });

    addToast(`Quest chain "${newChainName}" created!`, 'success');
    setNewChainName('');
    setNewChainDesc('');
    setNewChainItem('');
    setSteps([{ title: '', description: '', hasBranches: false, branches: [{ label: '', description: '', xpBonus: 25 }, { label: '', description: '', xpBonus: 25 }] }]);
    setShowAddChain(false);
  };

  const handleStepComplete = (chain: QuestChain, step: QuestStep) => {
    // Steps with branches must be completed via handleBranchChoice instead
    if (step.branches && step.branches.length > 0) return;

    const stepIndex = chain.steps.findIndex(s => s.id === step.id);
    const isLastStep = stepIndex === chain.steps.length - 1;

    completeQuestStep(chain.id, step.id);

    if (isLastStep) {
      addToast(`Quest chain "${chain.name}" completed! +${chain.reward.xp} XP, +${chain.reward.gold} Gold`, 'success');
    } else {
      addToast(`Step completed! Next: ${chain.steps[stepIndex + 1].title}`, 'success');
    }

    const updatedChain = useGameStore.getState().questChains.find(c => c.id === chain.id);
    if (updatedChain) setSelectedChain(updatedChain);
  };

  const handleBranchChoice = (chain: QuestChain, step: QuestStep, branch: StepBranch) => {
    const stepIndex = chain.steps.findIndex(s => s.id === step.id);
    const isLastStep = stepIndex === chain.steps.length - 1;

    chooseBranch(chain.id, step.id, branch.id);

    if (branch.xpBonus > 0) addToast(`Chose "${branch.label}"! +${branch.xpBonus} XP bonus`, 'success');
    if (isLastStep) addToast(`Quest chain "${chain.name}" completed! +${chain.reward.xp} XP, +${chain.reward.gold} Gold`, 'success');

    const updatedChain = useGameStore.getState().questChains.find(c => c.id === chain.id);
    if (updatedChain) setSelectedChain(updatedChain);
  };

  const activeChains = questChains.filter(c => !c.completed);
  const completedChains = questChains.filter(c => c.completed);

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
              <Map className="text-[var(--color-purple)]" />
              Quest Chains
            </h1>
          </div>
          <button
            onClick={() => setShowAddChain(true)}
            className="rpg-button !bg-[var(--color-purple)] !text-white"
          >
            <Plus size={18} />
            New Chain
          </button>
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
            <p className="text-2xl font-bold text-[var(--color-purple)]">{questChains.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Total Chains</p>
          </div>
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-green)]">{activeChains.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Active</p>
          </div>
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-yellow)]">{completedChains.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Completed</p>
          </div>
        </motion.div>

        {/* Active Quest Chains */}
        <h2 className="text-lg font-bold mb-4">Active Quest Chains</h2>
        <div className="space-y-4 mb-8">
          {activeChains.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              <Map size={48} className="mx-auto mb-4 opacity-30" />
              <p>No active quest chains</p>
              <p className="text-sm">Create one to get started!</p>
            </div>
          ) : (
            activeChains.map((chain, index) => (
              <motion.div
                key={chain.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rpg-card cursor-pointer hover:border-[var(--color-purple)]"
                onClick={() => setSelectedChain(chain)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{chain.name}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{chain.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className={`text-xs font-bold ${DIFFICULTY_COLORS[chain.difficulty]}`}>
                        {chain.difficulty}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Step {chain.currentStep + 1} of {chain.steps.length}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[var(--color-green)] text-sm">
                      <Zap size={14} /> +{chain.reward.xp}
                    </div>
                    <div className="flex items-center gap-1 text-[var(--color-yellow)] text-sm">
                      <Coins size={14} /> +{chain.reward.gold}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-purple)] rounded-full"
                      style={{ width: `${(chain.currentStep / chain.steps.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Step Preview */}
                <div className="mt-4 flex gap-2">
                  {chain.steps.map((step, i) => (
                    <div
                      key={step.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${step.completed
                        ? 'bg-[var(--color-green)] text-white'
                        : i === chain.currentStep
                          ? 'bg-[var(--color-purple)] text-white ring-2 ring-[var(--color-purple)] ring-offset-2 ring-offset-[var(--color-bg-card)]'
                          : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]'
                        }`}
                    >
                      {step.completed ? <Check size={14} /> : i + 1}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Completed Chains */}
        {completedChains.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy size={20} className="text-[var(--color-yellow)]" />
              Completed
            </h2>
            <div className="space-y-3">
              {completedChains.map((chain) => (
                <motion.div
                  key={chain.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rpg-card opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--color-green)] rounded-full flex items-center justify-center">
                      <Check size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{chain.name}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Completed all {chain.steps.length} steps
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-[var(--color-green)]">+{chain.reward.xp} XP</p>
                      <p className="text-[var(--color-yellow)]">+{chain.reward.gold} Gold</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Chain Detail Modal */}
      <AnimatePresence>
        {selectedChain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedChain(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[var(--color-border)]">
                <h2 className="text-2xl font-bold">{selectedChain.name}</h2>
                <p className="text-[var(--color-text-secondary)] mt-1">{selectedChain.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className={`text-sm font-bold ${DIFFICULTY_COLORS[selectedChain.difficulty]}`}>
                    {selectedChain.difficulty}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {selectedChain.steps.filter(s => s.completed).length}/{selectedChain.steps.length} steps
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {selectedChain.steps.map((step, index) => {
                    const isCurrent = index === selectedChain.currentStep && !step.completed;
                    const isCompleted = step.completed;
                    const isLocked = index > selectedChain.currentStep;

                    return (
                      <div
                        key={step.id}
                        className={`p-4 rounded-lg border-2 ${isCompleted
                          ? 'border-[var(--color-green)] bg-[var(--color-green)]/10'
                          : isCurrent
                            ? 'border-[var(--color-purple)]'
                            : 'border-[var(--color-border)] opacity-50'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                            ? 'bg-[var(--color-green)]'
                            : isCurrent
                              ? 'bg-[var(--color-purple)]'
                              : 'bg-[var(--color-bg-dark)]'
                            }`}>
                            {isCompleted ? (
                              <Check size={16} className="text-white" />
                            ) : isLocked ? (
                              <Lock size={14} />
                            ) : (
                              <Target size={16} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold">{step.title}</h4>
                            <p className="text-sm text-[var(--color-text-secondary)]">{step.description}</p>

                            {isCurrent && !step.branches?.length && (
                              <button
                                onClick={() => handleStepComplete(selectedChain, step)}
                                className="mt-3 rpg-button !bg-[var(--color-purple)] !text-white text-sm"
                              >
                                <Check size={14} />
                                Complete Step
                              </button>
                            )}
                            {isCurrent && step.branches && step.branches.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] tracking-wide uppercase">Choose your path:</p>
                                {step.branches.map(branch => (
                                  <button
                                    key={branch.id}
                                    onClick={() => handleBranchChoice(selectedChain, step, branch)}
                                    className="w-full text-left p-3 rounded-lg border border-[var(--color-purple)]/40 hover:border-[var(--color-purple)] hover:bg-[var(--color-purple)]/10 transition-all"
                                  >
                                    <p className="font-bold text-sm">{branch.label}</p>
                                    {branch.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{branch.description}</p>}
                                    {branch.xpBonus > 0 && <p className="text-xs text-[var(--color-green)] mt-1">+{branch.xpBonus} XP bonus</p>}
                                  </button>
                                ))}
                              </div>
                            )}
                            {isCompleted && step.chosenBranchId && step.branches && (
                              <p className="mt-2 text-xs text-[var(--color-purple)] italic">
                                Path taken: {step.branches.find(b => b.id === step.chosenBranchId)?.label}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedChain.completed && (
                  <div className="mt-6 p-4 bg-[var(--color-green)]/10 rounded-lg text-center">
                    <Trophy size={32} className="mx-auto mb-2 text-[var(--color-yellow)]" />
                    <p className="font-bold">Quest Chain Complete!</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      You earned {selectedChain.reward.xp} XP and {selectedChain.reward.gold} Gold
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Chain Modal */}
      <AnimatePresence>
        {showAddChain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddChain(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[var(--color-border)]">
                <h2 className="text-xl font-bold">Create Quest Chain</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Create a series of connected quests</p>
              </div>

              <div className="p-6 space-y-4">
                {/* AI Generator Section */}
                <div className="bg-[var(--color-purple)]/10 border border-[var(--color-purple)] rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-[var(--color-purple)]" />
                    <span className="font-bold text-sm text-[var(--color-purple)]">Generate with AI</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      placeholder="e.g., Learn Spanish basics..."
                      className="input-field flex-1 text-sm bg-[var(--color-bg-dark)] border-[var(--color-purple)]/30"
                      disabled={isGenerating}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateChain()}
                    />
                    <button
                      onClick={handleGenerateChain}
                      disabled={isGenerating || !generatePrompt.trim()}
                      className="rpg-button !bg-[var(--color-purple)] !text-white text-sm py-2 px-4 whitespace-nowrap disabled:opacity-50"
                    >
                      {isGenerating ? <span className="animate-spin">✨</span> : 'Generate'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Chain Name</label>
                  <input
                    type="text"
                    value={newChainName}
                    onChange={(e) => setNewChainName(e.target.value)}
                    className="input-field"
                    placeholder="e.g., Master Python Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Description</label>
                  <textarea
                    value={newChainDesc}
                    onChange={(e) => setNewChainDesc(e.target.value)}
                    className="input-field min-h-[80px]"
                    placeholder="Describe your quest chain..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Difficulty</label>
                  <select
                    value={newChainDifficulty}
                    onChange={(e) => setNewChainDifficulty(e.target.value as QuestChain['difficulty'])}
                    className="input-field"
                  >
                    <option value="Easy">Easy (50 XP, 25 Gold)</option>
                    <option value="Medium">Medium (150 XP, 75 Gold)</option>
                    <option value="Hard">Hard (300 XP, 150 Gold)</option>
                    <option value="Epic">Epic (750 XP, 375 Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Item Reward (Optional)</label>
                  <select
                    value={newChainItem}
                    onChange={(e) => setNewChainItem(e.target.value)}
                    className="input-field"
                  >
                    {ITEM_REWARDS.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-[var(--color-text-secondary)]">Steps</label>
                    <button
                      onClick={handleAddStep}
                      className="text-xs rpg-button py-1 px-2"
                    >
                      <Plus size={14} />
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div key={index} className="p-3 bg-[var(--color-bg-dark)] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">Step {index + 1}</span>
                          {steps.length > 1 && (
                            <button onClick={() => handleRemoveStep(index)} className="text-[var(--color-red)] text-xs">Remove</button>
                          )}
                        </div>
                        <input type="text" value={step.title} onChange={(e) => handleStepChange(index, 'title', e.target.value)} className="input-field" placeholder="Step title" />
                        <input type="text" value={step.description} onChange={(e) => handleStepChange(index, 'description', e.target.value)} className="input-field" placeholder="Step description" />
                        {/* Branch toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleBranches(index)}
                          className={`text-xs px-2 py-1 rounded border transition-all ${step.hasBranches ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/15 text-[var(--color-purple)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                        >
                          {step.hasBranches ? '↳ Branching ON' : '+ Add branch choices'}
                        </button>
                        {step.hasBranches && (
                          <div className="space-y-2 pl-2 border-l-2 border-[var(--color-purple)]/40">
                            {step.branches.map((branch, bi) => (
                              <div key={bi} className="space-y-1">
                                <p className="text-xs text-[var(--color-text-muted)] font-semibold">Path {bi + 1}</p>
                                <input type="text" value={branch.label} onChange={e => handleBranchChange(index, bi, 'label', e.target.value)} className="input-field !text-sm !py-1.5" placeholder={`Branch ${bi + 1} label`} />
                                <div className="flex gap-2">
                                  <input type="text" value={branch.description} onChange={e => handleBranchChange(index, bi, 'description', e.target.value)} className="input-field !text-sm !py-1.5 flex-1" placeholder="Brief description" />
                                  <input type="number" value={branch.xpBonus} onChange={e => handleBranchChange(index, bi, 'xpBonus', Number(e.target.value))} className="input-field !text-sm !py-1.5 w-20" min={0} max={500} placeholder="XP" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddChain(false)}
                    className="flex-1 rpg-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateChain}
                    disabled={!newChainName.trim() || steps.some(s => !s.title.trim())}
                    className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50"
                  >
                    Create Chain
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
