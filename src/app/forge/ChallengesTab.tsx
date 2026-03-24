'use client';

import { Swords, Lightbulb, FileText, Mic } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import ArgumentBuilder from '@/app/mindforge/ArgumentBuilder';
import AnalogyEngine from '@/app/mindforge/AnalogyEngine';
import SummaryChallenge from '@/app/mindforge/SummaryChallenge';
import ImpromptuSpeaking from '@/app/mindforge/ImpromptuSpeaking';

type Tab = 'argument' | 'analogy' | 'summary' | 'speaking';

const TABS: { id: Tab; label: string; icon: typeof Swords; color: string; desc: string }[] = [
  { id: 'argument', label: 'Argument Builder', icon: Swords, color: 'var(--color-red)', desc: 'Build structured arguments' },
  { id: 'analogy', label: 'Analogy Engine', icon: Lightbulb, color: 'var(--color-orange)', desc: 'Create analogies between concepts' },
  { id: 'summary', label: 'Summary Challenge', icon: FileText, color: 'var(--color-blue)', desc: 'Condense passages concisely' },
  { id: 'speaking', label: 'Impromptu Speaking', icon: Mic, color: 'var(--color-green)', desc: 'Practice articulate speech' },
];

export default function ChallengesTab() {
  const { vocabWords, uiTabs, setUiTab } = useGameStore();
  const tab = (uiTabs['mindforge'] as Tab) || 'argument';
  const setTab = (t: Tab) => setUiTab('mindforge', t);

  // Pass learned vocab words for cross-integration
  const learnedWords = vocabWords.map(w => w.word);

  return (
    <>
      {/* Sub-tab selector */}
      <div className="mb-4">
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
      {tab === 'argument' && <ArgumentBuilder vocabWords={learnedWords} />}
      {tab === 'analogy' && <AnalogyEngine vocabWords={learnedWords} />}
      {tab === 'summary' && <SummaryChallenge vocabWords={learnedWords} />}
      {tab === 'speaking' && <ImpromptuSpeaking vocabWords={learnedWords} />}
    </>
  );
}
