'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, BookOpen, Brain, TrendingUp } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { DailyWordsTab, ReviewTab, ProgressTab } from './components';
import PulseInsightStrip from '@/components/PulseInsightStrip';

type Tab = 'daily' | 'review' | 'progress';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'daily', label: 'Daily Words', icon: BookOpen },
  { id: 'review', label: 'Review', icon: Brain },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

export default function WordForgePage() {
  const [tab, setTab] = useState<Tab>('daily');
  const { vocabWords, vocabStreak } = useGameStore();

  const today = new Date().toISOString().split('T')[0];
  const dueCount = vocabWords.filter(w => w.nextReviewDate <= today).length;

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
              WordForge
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-[var(--color-purple)]/20 text-[var(--color-purple)]">
                AI-Powered
              </span>
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {vocabWords.length} words learned
              {vocabStreak > 0 && <> &middot; {vocabStreak}-day streak 🔥</>}
              {dueCount > 0 && <> &middot; <span className="text-[var(--color-orange)]">{dueCount} due</span></>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-2xl mx-auto px-4 flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                  isActive
                    ? 'border-[var(--color-purple)] text-white'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                <Icon size={14} />
                {t.label}
                {t.id === 'review' && dueCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-orange)] text-white ml-1">
                    {dueCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Pulse Insights for Vocab */}
        <PulseInsightStrip domains={['vocab']} />

        {tab === 'daily' && <DailyWordsTab />}
        {tab === 'review' && <ReviewTab />}
        {tab === 'progress' && <ProgressTab />}
      </div>
    </motion.div>
  );
}
