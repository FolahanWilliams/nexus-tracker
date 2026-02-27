'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Swords, Lightbulb, FileText } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import ArgumentBuilder from './ArgumentBuilder';
import AnalogyEngine from './AnalogyEngine';
import SummaryChallenge from './SummaryChallenge';

type Tab = 'argument' | 'analogy' | 'summary';

const TABS: { id: Tab; label: string; icon: typeof Swords; color: string; desc: string }[] = [
  { id: 'argument', label: 'Argument Builder', icon: Swords, color: 'var(--color-red)', desc: 'Build structured arguments' },
  { id: 'analogy', label: 'Analogy Engine', icon: Lightbulb, color: 'var(--color-orange)', desc: 'Create analogies between concepts' },
  { id: 'summary', label: 'Summary Challenge', icon: FileText, color: 'var(--color-blue)', desc: 'Condense passages concisely' },
];

export default function MindForgePage() {
  const [tab, setTab] = useState<Tab>('argument');
  const { vocabWords } = useGameStore();

  // Pass learned vocab words for cross-integration
  const learnedWords = vocabWords.map(w => w.word);

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              MindForge
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-[var(--color-orange)]/20 text-[var(--color-orange)]">
                AI-Powered
              </span>
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Sharpen your articulation, reasoning, and cognitive clarity
            </p>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-1 bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border)]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all"
              style={{
                background: tab === t.id ? `color-mix(in srgb, ${t.color} 15%, transparent)` : 'transparent',
                color: tab === t.id ? t.color : 'var(--color-text-muted)',
                borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              }}
            >
              <t.icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {tab === 'argument' && <ArgumentBuilder vocabWords={learnedWords} />}
        {tab === 'analogy' && <AnalogyEngine vocabWords={learnedWords} />}
        {tab === 'summary' && <SummaryChallenge vocabWords={learnedWords} />}
      </div>
    </motion.div>
  );
}
