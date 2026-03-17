'use client';

import { useGameStore, CLASS_BONUSES, xpForLevel, Skill } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { CLASS_RESPEC_GOLD_COST, previewAllClasses, buildRewardContext } from '@/lib/rewardCalculator';
import Link from 'next/link';
import {
  ChevronLeft, Pencil, Check, X,
  Brain, Zap, Flame, Lock, Star, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';

const CLASSES = ['Scholar', 'Strategist', 'Warrior', 'Merchant', 'Creator'] as const;
type AboutField = 'characterAge' | 'characterYearLevel' | 'characterMotto' | 'characterStrengths';
type Tab = 'profile' | 'skills' | 'classes';

const CLASS_EMOJI: Record<typeof CLASSES[number], string> = {
  Scholar: '📚', Strategist: '🧠', Warrior: '⚔️', Merchant: '💰', Creator: '🎨',
};

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
  'crafting': 'var(--color-yellow)',
};

export default function CharacterPage() {
  const {
    level, xp, gold,
    characterClass, characterName, characterAge, characterYearLevel, characterMotto, characterStrengths,
    setCharacterClass, respecClass, updateCharacterInfo,
    skills, upgradeSkill, unlockSkill, resetSkill, getSkillMultiplier,
    activeBuffs, vocabWords,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [confirmRespec, setConfirmRespec] = useState<typeof CLASSES[number] | null>(null);
  const [editingField, setEditingField] = useState<AboutField | 'name' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Profile helpers
  const startEdit = (field: AboutField | 'name', currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };
  const saveEdit = () => {
    if (!editingField) return;
    if (editingField === 'name') updateCharacterInfo({ characterName: editValue });
    else updateCharacterInfo({ [editingField]: editValue });
    setEditingField(null);
  };
  const cancelEdit = () => setEditingField(null);

  const xpCurrent = xpForLevel(level);
  const xpNext = xpForLevel(level + 1);
  const xpProgress = xpNext > xpCurrent ? Math.min(((xp - xpCurrent) / (xpNext - xpCurrent)) * 100, 100) : 100;

  const aboutFields: { key: AboutField; label: string; icon: string; placeholder: string }[] = [
    { key: 'characterAge',       label: 'Age',        icon: '👤', placeholder: 'e.g., 20' },
    { key: 'characterYearLevel', label: 'Year Level',  icon: '🎓', placeholder: 'e.g., Year 2 University' },
    { key: 'characterMotto',     label: 'Motto',       icon: '💬', placeholder: 'e.g., 1% better every day' },
    { key: 'characterStrengths', label: 'Strengths',   icon: '💪', placeholder: 'e.g., Focused, creative, driven' },
  ];
  const currentAbout: Record<AboutField, string> = { characterAge, characterYearLevel, characterMotto, characterStrengths };

  // Skills helpers
  const xpMultiplier = getSkillMultiplier('xp');
  const goldMultiplier = getSkillMultiplier('gold');
  const getUpgradeCost = (skill: Skill) => skill.cost * (skill.currentLevel + 1);
  const canAffordSkill = (skill: Skill) => xp >= getUpgradeCost(skill);

  const handleUpgrade = () => {
    if (!selectedSkill || selectedSkill.currentLevel >= selectedSkill.maxLevel) return;
    const cost = getUpgradeCost(selectedSkill);
    if (xp >= cost) {
      upgradeSkill(selectedSkill.id);
      addToast(`${selectedSkill.name} upgraded to level ${selectedSkill.currentLevel + 1}!`, 'success');
      setSelectedSkill(null);
    } else {
      addToast(`Not enough XP! Need ${cost - xp} more XP.`, 'error');
    }
  };
  const handleUnlock = () => {
    if (selectedSkill && !selectedSkill.unlocked) {
      unlockSkill(selectedSkill.id);
      addToast(`${selectedSkill.name} unlocked!`, 'success');
      setSelectedSkill({ ...selectedSkill, unlocked: true });
    }
  };

  // Class comparison data
  const classPreview = useMemo(() => {
    const ctx = buildRewardContext({ characterClass, skills, activeBuffs, vocabWords });
    return previewAllClasses(ctx, 100); // base 100 for easy percentage reading
  }, [characterClass, skills, activeBuffs, vocabWords]);

  const handleRespec = (newClass: typeof CLASSES[number]) => {
    if (!characterClass) {
      // First-time selection is free
      setCharacterClass(newClass);
      addToast(`Welcome, ${newClass}! Class selected.`, 'success');
      setConfirmRespec(null);
      return;
    }
    if (newClass === characterClass) {
      setConfirmRespec(null);
      return;
    }
    const success = respecClass(newClass);
    if (success) {
      addToast(`Respecced to ${newClass}! (-${CLASS_RESPEC_GOLD_COST}g)`, 'success');
    } else {
      addToast(`Not enough gold! Need ${CLASS_RESPEC_GOLD_COST}g to respec.`, 'error');
    }
    setConfirmRespec(null);
  };

  return (
    <motion.div
      className="min-h-screen pb-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 pt-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Character</h1>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 mt-2">
          {(['profile', 'skills', 'classes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-purple)] text-[var(--color-purple)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab === 'profile' ? 'Profile' : tab === 'skills' ? 'Skill Tree' : 'Classes'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Name & Title Card */}
          <motion.div className="rpg-card mb-8" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            {editingField === 'name' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="input-field flex-1" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                />
                <button onClick={saveEdit} className="rpg-button !py-2 !px-3 !bg-[var(--color-green)] !text-white"><Check size={18} /></button>
                <button onClick={cancelEdit} className="rpg-button !py-2 !px-3"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">{characterName} — The Rising {characterClass || 'Adventurer'}</h2>
                  {characterMotto && <p className="text-[var(--color-text-secondary)] italic text-sm">&ldquo;{characterMotto}&rdquo;</p>}
                </div>
                <button onClick={() => startEdit('name', characterName)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-purple)] transition-colors" aria-label="Edit name">
                  <Pencil size={18} />
                </button>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Avatar */}
              <motion.div className="flex justify-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[var(--color-purple)]/30 to-[var(--color-blue)]/30 border-4 border-[var(--color-purple)] flex items-center justify-center">
                  <span className="text-7xl">{characterClass ? CLASS_EMOJI[characterClass] : '🧙'}</span>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div className="rpg-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="text-lg font-bold mb-4">Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)] text-sm">Level</span>
                    <span className="font-bold text-[var(--color-purple)]">{level}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)] text-sm">Total XP</span>
                    <span className="font-bold text-[var(--color-green)]">{xp.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)] text-sm">Class</span>
                    <span className="font-bold">{characterClass || 'None'}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                    <span>XP to Level {level + 1}</span>
                    <span>{xp.toLocaleString()} / {xpNext.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-[var(--color-green)] rounded-full" initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 0.8, delay: 0.5 }} />
                  </div>
                </div>
              </motion.div>

              {/* About You */}
              <motion.div className="rpg-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <h3 className="text-lg font-bold mb-4">About You</h3>
                <div className="space-y-3">
                  {aboutFields.map(({ key, label, icon, placeholder }) => (
                    <div key={key}>
                      {editingField === key ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg flex-shrink-0">{icon}</span>
                          <input
                            type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                            placeholder={placeholder} className="input-field flex-1 !py-1.5 text-sm" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          />
                          <button onClick={saveEdit} className="text-[var(--color-green)] hover:opacity-80 flex-shrink-0"><Check size={18} /></button>
                          <button onClick={cancelEdit} className="text-[var(--color-text-muted)] hover:opacity-80 flex-shrink-0"><X size={18} /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(key, currentAbout[key])} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-dark)] transition-colors text-left group">
                          <span className="text-lg flex-shrink-0">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                            <p className={`text-sm ${currentAbout[key] ? '' : 'text-[var(--color-text-muted)] italic'}`}>
                              {currentAbout[key] || `Tap to add ${label.toLowerCase()}...`}
                            </p>
                          </div>
                          <Pencil size={14} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column — Class Selection */}
            <div>
              <motion.div className="rpg-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="text-lg font-bold mb-6 text-center">Choose Your Class</h3>
                <div className="grid grid-cols-1 gap-3">
                  {CLASSES.map((classOption, index) => (
                    <motion.button
                      key={classOption}
                      className={`flex items-center gap-3 text-left p-3 rounded-lg border transition-all ${
                        characterClass === classOption
                          ? 'bg-[var(--color-purple)] text-white border-[var(--color-purple)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-purple)]/50 hover:bg-[var(--color-bg-dark)]'
                      }`}
                      onClick={() => setCharacterClass(classOption)}
                      aria-pressed={characterClass === classOption}
                      aria-label={`Select ${classOption}: ${CLASS_BONUSES[classOption].description}`}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.08 }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl">{CLASS_EMOJI[classOption]}</span>
                      <div className="flex-1">
                        <p className="font-bold">{classOption}</p>
                        <p className={`text-xs ${characterClass === classOption ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                          {CLASS_BONUSES[classOption].description}
                        </p>
                      </div>
                      {characterClass === classOption && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">Active</span>}
                    </motion.button>
                  ))}
                </div>
                {characterClass && (
                  <motion.div className="mt-6 p-4 bg-[var(--color-purple)]/10 border border-[var(--color-purple)] rounded-lg" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <p className="text-sm text-[var(--color-purple)] font-bold mb-1">Active Bonus</p>
                    <p className="text-sm">{CLASS_BONUSES[characterClass].description}</p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* ── Skills Tab ── */}
      {activeTab === 'skills' && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Active Bonuses */}
          <motion.div className="rpg-card mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                <h2 className="text-lg font-bold mb-4 capitalize flex items-center gap-2" style={{ color: CATEGORY_COLORS[category] }}>
                  {category}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categorySkills.map((skill, index) => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}
                      className={`rpg-card cursor-pointer relative ${!skill.unlocked ? 'opacity-60' : ''} ${skill.currentLevel === skill.maxLevel ? 'ring-2 ring-[var(--color-yellow)]' : ''}`}
                      onClick={() => setSelectedSkill(skill)}
                    >
                      {!skill.unlocked && <div className="absolute top-2 right-2"><Lock size={16} className="text-[var(--color-text-muted)]" /></div>}
                      {skill.currentLevel === skill.maxLevel && (
                        <div className="absolute -top-2 -right-2">
                          <div className="bg-[var(--color-yellow)] rounded-full p-1"><Star size={12} className="text-black" /></div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: skill.unlocked ? CATEGORY_COLORS[category] : 'var(--color-border)', opacity: skill.unlocked ? 1 : 0.3 }}>
                          {SKILL_ICONS[skill.icon] || <Star size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{skill.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">Lv. {skill.currentLevel}/{skill.maxLevel}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: skill.maxLevel }).map((_, i) => (
                          <div key={i} className={`flex-1 h-2 rounded-full ${i < skill.currentLevel ? '' : 'bg-[var(--color-border)]'}`}
                            style={{ backgroundColor: i < skill.currentLevel ? CATEGORY_COLORS[category] : undefined }} />
                        ))}
                      </div>
                      {skill.currentLevel > 0 && skill.effects.xpMultiplier && (
                        <p className="text-xs text-[var(--color-green)] mt-2">+{(skill.effects.xpMultiplier * skill.currentLevel * 100).toFixed(0)}% XP</p>
                      )}
                      {skill.currentLevel > 0 && skill.effects.goldMultiplier && (
                        <p className="text-xs text-[var(--color-yellow)] mt-2">+{(skill.effects.goldMultiplier * skill.currentLevel * 100).toFixed(0)}% Gold</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Classes Tab — Comparison & Respec ── */}
      {activeTab === 'classes' && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Comparison Table */}
          <motion.div className="rpg-card mb-6 overflow-x-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-lg font-bold mb-4">Class Comparison</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-semibold text-xs">Class</th>
                  <th className="text-center py-2 px-2 text-[var(--color-green)] font-semibold text-xs">XP</th>
                  <th className="text-center py-2 px-2 text-[var(--color-yellow)] font-semibold text-xs">Gold</th>
                  <th className="text-center py-2 px-2 text-[var(--color-red)] font-semibold text-xs">Boss DMG</th>
                  <th className="text-center py-2 px-2 text-[var(--color-blue)] font-semibold text-xs">Drop Bonus</th>
                  <th className="text-right py-2 pl-2 text-[var(--color-text-muted)] font-semibold text-xs">Specialty</th>
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((cls) => {
                  const bonus = CLASS_BONUSES[cls];
                  const preview = classPreview[cls];
                  const isActive = characterClass === cls;
                  return (
                    <tr key={cls} className={`border-b border-[var(--color-border)]/50 ${isActive ? 'bg-[var(--color-purple)]/10' : ''}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CLASS_EMOJI[cls]}</span>
                          <span className={`font-bold ${isActive ? 'text-[var(--color-purple)]' : ''}`}>{cls}</span>
                          {isActive && <span className="text-[9px] bg-[var(--color-purple)]/20 text-[var(--color-purple)] px-1.5 py-0.5 rounded-full font-bold">Active</span>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="font-mono font-bold text-[var(--color-green)]">{preview?.xp ?? 100}</span>
                        {bonus.xpMultiplier > 1 && <span className="text-[10px] text-[var(--color-green)] block">+{Math.round((bonus.xpMultiplier - 1) * 100)}%</span>}
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="font-mono font-bold text-[var(--color-yellow)]">{preview?.gold ?? 100}</span>
                        {bonus.goldMultiplier > 1 && <span className="text-[10px] text-[var(--color-yellow)] block">+{Math.round((bonus.goldMultiplier - 1) * 100)}%</span>}
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="font-mono font-bold text-[var(--color-red)]">{preview?.boss ?? 100}</span>
                        {bonus.bossMultiplier > 1 && <span className="text-[10px] text-[var(--color-red)] block">+{Math.round((bonus.bossMultiplier - 1) * 100)}%</span>}
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className={`font-mono font-bold ${bonus.dropBonus > 0 ? 'text-[var(--color-blue)]' : 'text-[var(--color-text-muted)]'}`}>
                          {bonus.dropBonus > 0 ? `+${Math.round(bonus.dropBonus * 100)}%` : '—'}
                        </span>
                      </td>
                      <td className="text-right py-3 pl-2 text-xs text-[var(--color-text-secondary)] max-w-[120px]">
                        {bonus.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-3">
              Values show projected reward for a base-100 action with your current skills and buffs.
            </p>
          </motion.div>

          {/* Respec Section */}
          <motion.div className="rpg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={18} className="text-[var(--color-purple)]" />
              <h2 className="text-lg font-bold">{characterClass ? 'Change Class' : 'Choose Your Class'}</h2>
            </div>
            {characterClass && (
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Respec costs <span className="font-bold text-[var(--color-yellow)]">{CLASS_RESPEC_GOLD_COST} gold</span>.
                You have <span className={`font-bold ${gold >= CLASS_RESPEC_GOLD_COST ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>{gold}g</span>.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CLASSES.map((cls, index) => {
                const bonus = CLASS_BONUSES[cls];
                const isActive = characterClass === cls;
                const isConfirming = confirmRespec === cls;
                return (
                  <motion.div
                    key={cls}
                    className={`p-4 rounded-lg border transition-all ${
                      isActive
                        ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/10'
                        : 'border-[var(--color-border)] hover:border-[var(--color-purple)]/40'
                    }`}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.05 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{CLASS_EMOJI[cls]}</span>
                      <div>
                        <p className="font-bold">{cls}</p>
                        {isActive && <p className="text-[10px] text-[var(--color-purple)] font-bold">Currently Active</p>}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-3">{bonus.description}</p>
                    <div className="grid grid-cols-2 gap-1 mb-3 text-[10px]">
                      <span className="text-[var(--color-green)]">XP: x{bonus.xpMultiplier.toFixed(2)}</span>
                      <span className="text-[var(--color-yellow)]">Gold: x{bonus.goldMultiplier.toFixed(2)}</span>
                      <span className="text-[var(--color-red)]">Boss: x{bonus.bossMultiplier.toFixed(2)}</span>
                      <span className="text-[var(--color-blue)]">Drop: +{Math.round(bonus.dropBonus * 100)}%</span>
                    </div>
                    {isActive ? (
                      <div className="text-center py-1.5 rounded-lg bg-[var(--color-purple)]/20 text-xs font-bold text-[var(--color-purple)]">
                        Active
                      </div>
                    ) : isConfirming ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespec(cls)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-purple)] text-white hover:bg-[var(--color-purple)]/80 transition-colors"
                        >
                          Confirm{characterClass ? ` (-${CLASS_RESPEC_GOLD_COST}g)` : ''}
                        </button>
                        <button
                          onClick={() => setConfirmRespec(null)}
                          className="py-1.5 px-3 rounded-lg text-xs font-bold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-dark)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRespec(cls)}
                        className="w-full py-1.5 rounded-lg text-xs font-bold border border-[var(--color-purple)]/40 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/10 transition-colors"
                      >
                        {characterClass ? 'Switch to this class' : 'Select'}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Skill Detail Modal */}
      <AnimatePresence>
        {selectedSkill && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSkill(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 rounded-t-lg" style={{ backgroundColor: `${CATEGORY_COLORS[selectedSkill.category]}20` }}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: CATEGORY_COLORS[selectedSkill.category] }}>
                    {SKILL_ICONS[selectedSkill.icon] || <Star size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedSkill.name}</h2>
                    <p className="text-[var(--color-text-secondary)] capitalize">{selectedSkill.category}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-[var(--color-text-secondary)] mb-6">{selectedSkill.description}</p>
                {selectedSkill.prerequisites.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-bold mb-2">Prerequisites:</p>
                    <div className="space-y-2">
                      {selectedSkill.prerequisites.map(prereqId => {
                        const prereq = skills.find(s => s.id === prereqId);
                        return prereq ? (
                          <div key={prereqId} className="flex items-center gap-2 text-sm">
                            {prereq.unlocked ? <Check size={16} className="text-[var(--color-green)]" /> : <Lock size={16} className="text-[var(--color-text-muted)]" />}
                            <span className={prereq.unlocked ? '' : 'text-[var(--color-text-muted)]'}>{prereq.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                {selectedSkill.currentLevel > 0 && (
                  <div className="mb-6 p-4 bg-[var(--color-bg-dark)] rounded-lg">
                    <p className="text-sm font-bold mb-2">Current Effects:</p>
                    {selectedSkill.effects.xpMultiplier && (
                      <p className="text-[var(--color-green)]">+{(selectedSkill.effects.xpMultiplier * selectedSkill.currentLevel * 100).toFixed(0)}% XP from quests</p>
                    )}
                    {selectedSkill.effects.goldMultiplier && (
                      <p className="text-[var(--color-yellow)]">+{(selectedSkill.effects.goldMultiplier * selectedSkill.currentLevel * 100).toFixed(0)}% Gold from quests</p>
                    )}
                  </div>
                )}
                {selectedSkill.unlocked ? (
                  <div>
                    {selectedSkill.currentLevel < selectedSkill.maxLevel ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-[var(--color-text-secondary)]">Upgrade Cost:</span>
                          <span className={`font-bold ${canAffordSkill(selectedSkill) ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                            {getUpgradeCost(selectedSkill)} XP
                          </span>
                        </div>
                        <button onClick={handleUpgrade} disabled={!canAffordSkill(selectedSkill)}
                          className="w-full rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50">
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
                      <button onClick={() => { resetSkill(selectedSkill.id); addToast(`${selectedSkill.name} reset — 70% XP refunded`, 'info'); setSelectedSkill(null); }}
                        className="w-full rpg-button !border-[var(--color-red)] text-[var(--color-red)] hover:!bg-[var(--color-red)]/10 mt-3 text-sm">
                        Reset Skill (70% XP refund)
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-[var(--color-orange)]">
                      <AlertCircle size={20} /><span>Locked</span>
                    </div>
                    <button onClick={handleUnlock}
                      disabled={!selectedSkill.prerequisites.every(id => skills.find(s => s.id === id)?.unlocked)}
                      className="w-full rpg-button !bg-[var(--color-green)] !text-white disabled:opacity-50">
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
