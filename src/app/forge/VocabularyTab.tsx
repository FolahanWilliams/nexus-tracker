'use client';

import { BookOpen, Brain, TrendingUp, Library } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { DailyWordsTab, ReviewTab, ProgressTab, CollectionTab } from '@/app/wordforge/components';
import PulseInsightStrip from '@/components/PulseInsightStrip';

type Tab = 'daily' | 'review' | 'collection' | 'progress';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'daily', label: 'Daily Words', icon: BookOpen },
  { id: 'review', label: 'Review', icon: Brain },
  { id: 'collection', label: 'Collection', icon: Library },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

export default function VocabularyTab() {
  const { vocabWords, vocabStreak, uiTabs, setUiTab } = useGameStore();
  const tab = (uiTabs['wordforge'] as Tab) || 'daily';
  const setTab = (t: Tab) => setUiTab('wordforge', t);

  const today = new Date().toISOString().split('T')[0];
  const dueCount = vocabWords.filter(w => w.nextReviewDate <= today).length;

  return (
    <>
      {/* Stats bar */}
      <div className="mb-4">
        <p className="text-xs text-[var(--color-text-secondary)]">
          {vocabWords.length} words learned
          {vocabStreak > 0 && <> &middot; {vocabStreak}-day streak 🔥</>}
          {dueCount > 0 && <> &middot; <span className="text-[var(--color-orange)]">{dueCount} due</span></>}
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-[var(--color-border)] mb-4">
        <div className="flex gap-1">
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

      {/* Pulse Insights for Vocab */}
      <PulseInsightStrip domains={['vocab']} />

      {tab === 'daily' && <DailyWordsTab />}
      {tab === 'review' && <ReviewTab />}
      {tab === 'collection' && <CollectionTab />}
      {tab === 'progress' && <ProgressTab />}
    </>
  );
}
