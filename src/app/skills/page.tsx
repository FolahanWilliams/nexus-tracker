'use client';

import { useGameStore, Skill, CLASS_BONUSES } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { useState } from 'react';
import { 
  Brain, 
  Zap, 
  Flame, 
  Lock,
  ChevronLeft,
  Check,
  Star,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const SKILL_ICONS: Record<string, React.ReactNode> = {
  'brain': <Brain size={24} />,
  'coins': <Star size={24} />,
  'flame': <Flame size={24} />,
  'zap': <Zap size={24} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'productivity': 'var(--color-green)',
  'combat': 'var(--color-red)',
  'magic': 'var(--color-purple)',
  'crafting': 'var(--color-yellow)'
};

export default function SkillsPage() {
  const { skills, xp, characterClass, upgradeSkill, unlockSkill, resetSkill, getSkillMultiplier } = useGameStore();
  const { addToast } = useToastStore();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const xpMultiplier = getSkillMultiplier('xp');
  const goldMultiplier = getSkillMultiplier('gold');

  const handleUpgrade = () => {
    if (selectedSkill && selectedSkill.currentLevel < selectedSkill.maxLevel) {
      const cost = getUpgradeCost(selectedSkill);
      if (xp >= cost) {
        upgradeSkill(selectedSkill.id);
        addToast(`${selectedSkill.name} upgraded to level ${selectedSkill.currentLevel + 1}!`, 'success');
        setSelectedSkill(null);
      } else {
        addToast(`Not enough XP! Need ${cost - xp} more XP.`, 'error');
      }
    }
  };

  const handleUnlock = () => {
    if (selectedSkill && !selectedSkill.unlocked) {
      unlockSkill(selectedSkill.id);
      addToast(`${selectedSkill.name} unlocked!`, 'success');
      setSelectedSkill({ ...selectedSkill, unlocked: true });
    }
  };

  const getUpgradeCost = (skill: Skill) => {
    return skill.cost * (skill.currentLevel + 1);
  };

  const canAfford = (skill: Skill) => {
    return xp >= getUpgradeCost(skill);
  };

  return (
    <motion.div 
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="text-[var(--color-purple)]" />
              Skill Tree
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Active Bonuses */}
        <motion.div 
          className="rpg-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold mb-4">Active Bonuses</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-dark)] p-4 rounded-lg">
              <p className="text-sm text-[var(--color-text-secondary)]">XP Multiplier</p>
              <p className="text-2xl font-bold text-[var(--color-green)]">x{xpMultiplier.toFixed(1)}</p>
            </div>
            <div className="bg-[var(--color-bg-dark)] p-4 rounded-lg">
              <p className="text-sm text-[var(--color-text-secondary)]">Gold Multiplier</p>
              <p className="text-2xl font-bold text-[var(--color-yellow)]">x{goldMultiplier.toFixed(1)}</p>
            </div>
          </div>
          {characterClass && (
            <div className="mt-4 p-3 bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/30 rounded-lg">
              <p className="text-xs text-[var(--color-purple)] font-bold mb-1">{characterClass} Class Bonus</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{CLASS_BONUSES[characterClass].description}</p>
            </div>
          )}
          <p className="text-sm text-[var(--color-text-muted)] mt-4">
            Available XP: <span className="text-[var(--color-green)] font-bold">{xp}</span>
          </p>
        </motion.div>

        {/* Skill Categories */}
        {['productivity', 'crafting', 'combat', 'magic'].map((category) => {
          const categorySkills = skills.filter(s => s.category === category);
          if (categorySkills.length === 0) return null;

          return (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-bold mb-4 capitalize flex items-center gap-2" 
                  style={{ color: CATEGORY_COLORS[category] }}>
                {category}
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categorySkills.map((skill, index) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`rpg-card cursor-pointer relative ${
                      !skill.unlocked ? 'opacity-60' : ''
                    } ${skill.currentLevel === skill.maxLevel ? 'ring-2 ring-[var(--color-yellow)]' : ''}`}
                    onClick={() => setSelectedSkill(skill)}
                  >
                    {!skill.unlocked && (
                      <div className="absolute top-2 right-2">
                        <Lock size={16} className="text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    
                    {skill.currentLevel === skill.maxLevel && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-[var(--color-yellow)] rounded-full p-1">
                          <Star size={12} className="text-black" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ 
                          backgroundColor: skill.unlocked ? CATEGORY_COLORS[category] : 'var(--color-border)',
                          opacity: skill.unlocked ? 1 : 0.3
                        }}
                      >
                        {SKILL_ICONS[skill.icon] || <Star size={24} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{skill.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Lv. {skill.currentLevel}/{skill.maxLevel}
                        </p>
                      </div>
                    </div>

                    {/* Level Indicators */}
                    <div className="flex gap-1">
                      {Array.from({ length: skill.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-2 rounded-full ${
                            i < skill.currentLevel 
                              ? '' 
                              : 'bg-[var(--color-border)]'
                          }`}
                          style={{
                            backgroundColor: i < skill.currentLevel ? CATEGORY_COLORS[category] : undefined
                          }}
                        />
                      ))}
                    </div>

                    {skill.currentLevel > 0 && skill.effects.xpMultiplier && (
                      <p className="text-xs text-[var(--color-green)] mt-2">
                        +{(skill.effects.xpMultiplier * skill.currentLevel * 100).toFixed(0)}% XP
                      </p>
                    )}
                    {skill.currentLevel > 0 && skill.effects.goldMultiplier && (
                      <p className="text-xs text-[var(--color-yellow)] mt-2">
                        +{(skill.effects.goldMultiplier * skill.currentLevel * 100).toFixed(0)}% Gold
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill Detail Modal */}
      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSkill(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="p-6 rounded-t-lg"
                style={{ backgroundColor: `${CATEGORY_COLORS[selectedSkill.category]}20` }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: CATEGORY_COLORS[selectedSkill.category] }}
                  >
                    {SKILL_ICONS[selectedSkill.icon] || <Star size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedSkill.name}</h2>
                    <p className="text-[var(--color-text-secondary)] capitalize">{selectedSkill.category}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-[var(--color-text-secondary)] mb-6">
                  {selectedSkill.description}
                </p>

                {/* Prerequisites */}
                {selectedSkill.prerequisites.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-bold mb-2">Prerequisites:</p>
                    <div className="space-y-2">
                      {selectedSkill.prerequisites.map(prereqId => {
                        const prereq = skills.find(s => s.id === prereqId);
                        return prereq ? (
                          <div key={prereqId} className="flex items-center gap-2 text-sm">
                            {prereq.unlocked ? (
                              <Check size={16} className="text-[var(--color-green)]" />
                            ) : (
                              <Lock size={16} className="text-[var(--color-text-muted)]" />
                            )}
                            <span className={prereq.unlocked ? '' : 'text-[var(--color-text-muted)]'}>
                              {prereq.name}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Current Effects */}
                {selectedSkill.currentLevel > 0 && (
                  <div className="mb-6 p-4 bg-[var(--color-bg-dark)] rounded-lg">
                    <p className="text-sm font-bold mb-2">Current Effects:</p>
                    {selectedSkill.effects.xpMultiplier && (
                      <p className="text-[var(--color-green)]">
                        +{(selectedSkill.effects.xpMultiplier * selectedSkill.currentLevel * 100).toFixed(0)}% XP from quests
                      </p>
                    )}
                    {selectedSkill.effects.goldMultiplier && (
                      <p className="text-[var(--color-yellow)]">
                        +{(selectedSkill.effects.goldMultiplier * selectedSkill.currentLevel * 100).toFixed(0)}% Gold from quests
                      </p>
                    )}
                  </div>
                )}

                {/* Upgrade Section */}
                {selectedSkill.unlocked ? (
                  <div>
                    {selectedSkill.currentLevel < selectedSkill.maxLevel ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-[var(--color-text-secondary)]">Upgrade Cost:</span>
                          <span className={`font-bold ${canAfford(selectedSkill) ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                            {getUpgradeCost(selectedSkill)} XP
                          </span>
                        </div>
                        <button
                          onClick={handleUpgrade}
                          disabled={!canAfford(selectedSkill)}
                          className="w-full rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50"
                          aria-label={`Upgrade ${selectedSkill.name}`}
                        >
                          Upgrade to Level {selectedSkill.currentLevel + 1}
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4 bg-[var(--color-yellow)]/10 rounded-lg">
                        <Star className="mx-auto mb-2 text-[var(--color-yellow)]" size={32} />
                        <p className="font-bold">Max Level Reached!</p>
                      </div>
                    )}
                    {selectedSkill.currentLevel > 0 && (
                      <button
                        onClick={() => {
                          resetSkill(selectedSkill.id);
                          addToast(`${selectedSkill.name} reset — 70% XP refunded`, 'info');
                          setSelectedSkill(null);
                        }}
                        className="w-full rpg-button !border-[var(--color-red)] text-[var(--color-red)] hover:!bg-[var(--color-red)]/10 mt-3 text-sm"
                        aria-label={`Reset ${selectedSkill.name}`}
                      >
                        Reset Skill (70% XP refund)
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-[var(--color-orange)]">
                      <AlertCircle size={20} />
                      <span>Locked</span>
                    </div>
                    <button
                      onClick={handleUnlock}
                      disabled={!selectedSkill.prerequisites.every(id => skills.find(s => s.id === id)?.unlocked)}
                      className="w-full rpg-button !bg-[var(--color-green)] !text-white disabled:opacity-50"
                    >
                      Unlock Skill
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
