'use client';

import { useGameStore, CLASS_BONUSES, xpForLevel } from '@/store/useGameStore';
import Link from 'next/link';
import { ChevronLeft, Pencil, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const CLASSES = ['Scholar', 'Strategist', 'Warrior', 'Merchant', 'Creator'] as const;

type AboutField = 'characterAge' | 'characterYearLevel' | 'characterMotto' | 'characterStrengths';

const CLASS_EMOJI: Record<typeof CLASSES[number], string> = {
  Scholar: '📚',
  Strategist: '🧠',
  Warrior: '⚔️',
  Merchant: '💰',
  Creator: '🎨',
};

export default function CharacterPage() {
  const {
    level,
    xp,
    characterClass,
    characterName,
    characterAge,
    characterYearLevel,
    characterMotto,
    characterStrengths,
    setCharacterClass,
    updateCharacterInfo,
  } = useGameStore();

  const [editingField, setEditingField] = useState<AboutField | 'name' | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field: AboutField | 'name', currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingField) return;
    if (editingField === 'name') {
      updateCharacterInfo({ characterName: editValue });
    } else {
      updateCharacterInfo({ [editingField]: editValue });
    }
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

  const currentAbout: Record<AboutField, string> = {
    characterAge,
    characterYearLevel,
    characterMotto,
    characterStrengths,
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Character</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Name & Title Card */}
        <motion.div
          className="rpg-card mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {editingField === 'name' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="input-field flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              />
              <button onClick={saveEdit} className="rpg-button !py-2 !px-3 !bg-[var(--color-green)] !text-white">
                <Check size={18} />
              </button>
              <button onClick={cancelEdit} className="rpg-button !py-2 !px-3">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">
                  {characterName} — The Rising {characterClass || 'Adventurer'}
                </h2>
                {characterMotto && (
                  <p className="text-[var(--color-text-secondary)] italic text-sm">
                    &ldquo;{characterMotto}&rdquo;
                  </p>
                )}
              </div>
              <button
                onClick={() => startEdit('name', characterName)}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-purple)] transition-colors"
                aria-label="Edit name"
              >
                <Pencil size={18} />
              </button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">

            {/* Avatar */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[var(--color-purple)]/30 to-[var(--color-blue)]/30 border-4 border-[var(--color-purple)] flex items-center justify-center">
                <span className="text-7xl">
                  {characterClass ? CLASS_EMOJI[characterClass] : '🧙'}
                </span>
              </div>
            </motion.div>

            {/* Stats Box */}
            <motion.div
              className="rpg-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
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

              {/* XP progress bar */}
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                  <span>XP to Level {level + 1}</span>
                  <span>{xp.toLocaleString()} / {xpNext.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--color-green)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* About You — fully editable */}
            <motion.div
              className="rpg-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-bold mb-4">About You</h3>
              <div className="space-y-3">
                {aboutFields.map(({ key, label, icon, placeholder }) => (
                  <div key={key}>
                    {editingField === key ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg flex-shrink-0">{icon}</span>
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          placeholder={placeholder}
                          className="input-field flex-1 !py-1.5 text-sm"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        />
                        <button onClick={saveEdit} className="text-[var(--color-green)] hover:opacity-80 flex-shrink-0">
                          <Check size={18} />
                        </button>
                        <button onClick={cancelEdit} className="text-[var(--color-text-muted)] hover:opacity-80 flex-shrink-0">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(key, currentAbout[key])}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-dark)] transition-colors text-left group"
                      >
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
            <motion.div
              className="rpg-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-2xl">{CLASS_EMOJI[classOption]}</span>
                    <div className="flex-1">
                      <p className="font-bold">{classOption}</p>
                      <p className={`text-xs ${characterClass === classOption ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                        {CLASS_BONUSES[classOption].description}
                      </p>
                    </div>
                    {characterClass === classOption && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">Active</span>
                    )}
                  </motion.button>
                ))}
              </div>

              {characterClass && (
                <motion.div
                  className="mt-6 p-4 bg-[var(--color-purple)]/10 border border-[var(--color-purple)] rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p className="text-sm text-[var(--color-purple)] font-bold mb-1">Active Bonus</p>
                  <p className="text-sm">{CLASS_BONUSES[characterClass].description}</p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
