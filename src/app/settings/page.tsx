'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Volume2, VolumeX, Moon, Sun, Settings as SettingsIcon, Download, Upload, Trash2, Music, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToastStore } from '@/components/ToastContainer';

export default function SettingsPage() {
  const { settings, updateSettings, exportSaveData, importSaveData, resetProgress } = useGameStore();
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleSound = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const toggleMusic = () => {
    updateSettings({ musicEnabled: !settings.musicEnabled });
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleExport = () => {
    const data = exportSaveData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Progress exported successfully!', 'success');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importSaveData(content);
      if (success) {
        addToast('Progress imported successfully!', 'success');
      } else {
        addToast('Failed to import progress. Invalid file.', 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    resetProgress();
    addToast('Progress has been reset!', 'info');
    setShowResetConfirm(false);
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
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
            Customize your QuestFlow experience.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Sound Effects */}
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {settings.soundEnabled ? (
                  <Volume2 className="text-[var(--color-purple)]" size={24} />
                ) : (
                  <VolumeX className="text-[var(--color-text-muted)]" size={24} />
                )}
                <div>
                  <h3 className="font-bold">Sound Effects</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Play sounds for actions and achievements
                  </p>
                </div>
              </div>
              <motion.button
                onClick={toggleSound}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-[var(--color-purple)]' : 'bg-[var(--color-border)]'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                  animate={{
                    left: settings.soundEnabled ? '32px' : '4px',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
          </motion.div>

          {/* Music */}
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {settings.musicEnabled ? (
                  <Music2 className="text-[var(--color-green)]" size={24} />
                ) : (
                  <Music className="text-[var(--color-text-muted)]" size={24} />
                )}
                <div>
                  <h3 className="font-bold">Background Music</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Play ambient music while using the app
                  </p>
                </div>
              </div>
              <motion.button
                onClick={toggleMusic}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.musicEnabled ? 'bg-[var(--color-green)]' : 'bg-[var(--color-border)]'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                  animate={{
                    left: settings.musicEnabled ? '32px' : '4px',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
          </motion.div>

          {/* Theme */}
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {settings.theme === 'dark' ? (
                  <Moon className="text-[var(--color-purple)]" size={24} />
                ) : (
                  <Sun className="text-[var(--color-yellow)]" size={24} />
                )}
                <div>
                  <h3 className="font-bold">Theme</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Switch between dark and light mode
                  </p>
                </div>
              </div>
              <motion.button
                onClick={toggleTheme}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.theme === 'dark' ? 'bg-[var(--color-purple)]' : 'bg-[var(--color-yellow)]'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                  animate={{
                    left: settings.theme === 'dark' ? '32px' : '4px',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
          </motion.div>

          {/* Export/Import */}
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Download className="text-[var(--color-blue)]" size={24} />
              <h3 className="font-bold">Data Management</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Export your progress to a file or import from a backup
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="rpg-button !bg-[var(--color-blue)] !text-white"
              >
                <Download size={16} />
                Export Data
              </button>
              <label className="rpg-button !bg-[var(--color-green)] !text-white cursor-pointer">
                <Upload size={16} />
                Import Data
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </motion.div>

          {/* Reset Progress */}
          <motion.div 
            className="rpg-card !border-[var(--color-red)]/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Trash2 className="text-[var(--color-red)]" size={24} />
              <h3 className="font-bold text-[var(--color-red)]">Danger Zone</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Reset all your progress. This action cannot be undone!
            </p>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="rpg-button !bg-[var(--color-red)]/20 !text-[var(--color-red)] border border-[var(--color-red)]"
              >
                <Trash2 size={16} />
                Reset Progress
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="rpg-button !bg-[var(--color-red)] !text-white"
                >
                  Yes, Reset Everything
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="rpg-button"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>

          {/* App Info */}
          <motion.div 
            className="rpg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <SettingsIcon className="text-[var(--color-purple)]" size={24} />
              <h3 className="font-bold">About QuestFlow</h3>
            </div>
            <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <p>Version: 2.0.0</p>
              <p>A gamified AI productivity tracker with RPG elements</p>
              <p className="mt-4 text-[var(--color-purple)]">Level up your life! 📈</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
