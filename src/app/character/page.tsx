'use client';

import { useGameStore } from '@/store/useGameStore';
import Link from 'next/link';
import { ChevronLeft, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const CLASSES = ['Scholar', 'Strategist', 'Warrior', 'Merchant', 'Creator'] as const;

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
    updateCharacterInfo 
  } = useGameStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(characterName);

  const handleClassSelect = (selectedClass: typeof CLASSES[number]) => {
    setCharacterClass(selectedClass);
  };

  const handleSaveName = () => {
    updateCharacterInfo({ characterName: editName });
    setIsEditing(false);
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

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Intro Text */}
        <motion.div 
          className="mb-8 border-l-4 border-[var(--color-purple)] pl-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[var(--color-purple)] italic font-medium">
            This is your identity and stat summary page.
          </p>
        </motion.div>

        {/* Character Name and Title */}
        <motion.div 
          className="rpg-card mb-8 flex items-center justify-between"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field flex-1"
                  autoFocus
                />
                <button onClick={handleSaveName} className="rpg-button !py-2 !px-4">
                  Save
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold mb-1 cursor-pointer hover:text-[var(--color-purple)] transition-colors" onClick={() => setIsEditing(true)}>
                  {characterName} - The Rising {characterClass || 'Adventurer'}
                </h2>
                <p className="text-[var(--color-text-secondary)] italic text-sm">
                  &ldquo;1% better every day.&rdquo;
                </p>
              </div>
            )}
          </div>
          <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <Minus size={20} />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Stats & Avatar */}
          <div className="space-y-8">
            {/* Avatar */}
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <img
                  src="https://pixabay.com/get/g58d07ef94cd059035d388d54cb2b80bf92daea308a0b05e702d7829b4f810588b264688b6da0e4b1c86a6d8295748a70.svg"
                  alt="Pixel art character avatar"
                  className="w-48 h-48"
                  style={{ width: '192px', height: '192px' }}
                />
              </div>
            </motion.div>

            {/* Stats Box */}
            <motion.div 
              className="rpg-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Stats</h3>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <span>🔒 Locked</span>
                  <button className="px-3 py-1 bg-[var(--color-blue)] text-white rounded text-xs font-medium hover:bg-[var(--color-purple)] transition-colors">
                    New
                  </button>
                </div>
              </div>

              <div className="stat-box mb-4">
                <p className="text-[var(--color-text-secondary)] text-sm mb-1">{characterName}</p>
                <div className="inline-block px-2 py-0.5 bg-[var(--color-badge-yellow)]/20 text-[var(--color-badge-yellow)] rounded text-xs font-bold">
                  {characterClass || 'No Class'}
                </div>
                <p className="text-[var(--color-blue)] font-bold mt-2">LEVEL {level}</p>
                <p className="text-[var(--color-green)] font-bold">{xp} XP</p>
              </div>

              <button className="w-full py-2 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-primary)] border-t border-[var(--color-border)] pt-3">
                + New page
              </button>
            </motion.div>

            {/* About You */}
            <motion.div 
              className="rpg-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-lg font-bold mb-4 text-center">ABOUT YOU</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-lg">👶</span>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">Age:</span>
                    <span className="text-[var(--color-text-primary)] ml-2">{characterAge || '[Enter Here]'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎓</span>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">Year Level:</span>
                    <span className="text-[var(--color-text-primary)] ml-2">{characterYearLevel || '[Enter Here]'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔵</span>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">Motto:</span>
                    <span className="text-[var(--color-text-primary)] ml-2">[{characterMotto}]</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🧱</span>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">Strengths:</span>
                    <span className="text-[var(--color-text-primary)] ml-2">[{characterStrengths}]</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Class Selection */}
          <div>
            <motion.div 
              className="rpg-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-bold mb-6 text-center">CHOOSE YOUR CLASS</h3>
              <div className="grid grid-cols-2 gap-3">
                {CLASSES.map((classOption, index) => (
                  <motion.button
                    key={classOption}
                    className={`class-button ${characterClass === classOption ? '!bg-[var(--color-purple)] !text-white !border-[var(--color-purple)]' : ''}`}
                    onClick={() => handleClassSelect(classOption)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {classOption}
                  </motion.button>
                ))}
              </div>

              {characterClass && (
                <motion.div
                  className="mt-6 p-4 bg-[var(--color-bg-dark)] border border-[var(--color-purple)] rounded"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm text-[var(--color-purple)] font-bold mb-2">Class Selected:</p>
                  <p className="text-lg font-bold">{characterClass}</p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
