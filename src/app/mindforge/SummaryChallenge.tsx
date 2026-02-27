'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, FileText, ArrowRight, CheckCircle, AlertTriangle,
  BookOpen, Scissors,
} from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

interface SummaryResult {
  score: number;
  keyPoints: number;
  conciseness: number;
  clarity: number;
  vocabUsage: number;
  feedback: string;
  missedPoints: string[];
  modelSummary: string;
}

interface Passage {
  passage: string;
  title: string;
  wordCount: number;
  difficulty: string;
}

export default function SummaryChallenge({ vocabWords }: { vocabWords: string[] }) {
  const { addXP, logActivity } = useGameStore();
  const { addToast } = useToastStore();

  const [phase, setPhase] = useState<'idle' | 'loading' | 'writing' | 'grading' | 'result'>('idle');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [summaryInput, setSummaryInput] = useState('');
  const [result, setResult] = useState<SummaryResult | null>(null);

  const generatePassage = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'summary', action: 'generate_passage', vocabWords: vocabWords.slice(0, 10) }),
      });
      const data = await res.json();
      if (data.passage) {
        setPassage(data);
        setSummaryInput('');
        setResult(null);
        setPhase('writing');
      } else {
        addToast('Could not generate passage.', 'error');
        setPhase('idle');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('idle');
    }
  };

  const submitSummary = async () => {
    if (!summaryInput.trim() || !passage) return;
    setPhase('grading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summary', action: 'evaluate',
          passage: passage.passage, summary: summaryInput,
          vocabWords: vocabWords.slice(0, 15),
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setPhase('result');
        const xp = Math.round(data.result.score / 5) + 5;
        addXP(xp);
        triggerXPFloat(`+${xp} XP`, '#4ade80');
        logActivity('xp_earned', '📝', `Summary Challenge: ${data.result.score}/100`, passage.title);
      } else {
        addToast('Could not evaluate summary.', 'error');
        setPhase('writing');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('writing');
    }
  };

  const summaryWordCount = summaryInput.trim().split(/\s+/).filter(Boolean).length;

  // ── IDLE ──
  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-[var(--color-blue)]" />
            <h2 className="text-sm font-bold">Summary Challenge</h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Read a passage and condense it to 1-3 sentences. This trains concise articulation — saying more with less.
          </p>
          <button
            onClick={generatePassage}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <FileText size={14} /> Generate Passage
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING / GRADING ──
  if (phase === 'loading' || phase === 'grading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="text-sm">{phase === 'grading' ? 'Evaluating your summary...' : 'Generating passage...'}</p>
      </div>
    );
  }

  // ── WRITING ──
  if (phase === 'writing' && passage) {
    return (
      <div className="space-y-4">
        {/* Passage */}
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase font-bold text-[var(--color-blue)] tracking-wider flex items-center gap-1">
              <BookOpen size={11} /> {passage.title}
            </p>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{
              color: passage.difficulty === 'beginner' ? 'var(--color-green)' : passage.difficulty === 'intermediate' ? 'var(--color-blue)' : 'var(--color-orange)',
              background: passage.difficulty === 'beginner' ? 'rgba(74,222,128,0.1)' : passage.difficulty === 'intermediate' ? 'rgba(59,130,246,0.1)' : 'rgba(251,146,60,0.1)',
            }}>{passage.difficulty} &middot; {passage.wordCount} words</span>
          </div>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{passage.passage}</p>
        </div>

        {/* Summary input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider flex items-center gap-1">
              <Scissors size={10} /> Your Summary (1-3 sentences)
            </label>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {summaryWordCount} word{summaryWordCount !== 1 ? 's' : ''}
            </span>
          </div>
          <textarea
            value={summaryInput}
            onChange={e => setSummaryInput(e.target.value)}
            placeholder="Summarize the key points in 1-3 clear sentences..."
            autoFocus
            className="w-full p-3 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-white resize-none focus:outline-none focus:border-[var(--color-blue)]"
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => setPhase('idle')} className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={submitSummary}
            disabled={!summaryInput.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            Submit Summary <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && result && passage) {
    const dims = [
      { key: 'keyPoints' as const, label: 'Key Points', icon: CheckCircle, color: 'var(--color-green)' },
      { key: 'conciseness' as const, label: 'Conciseness', icon: Scissors, color: 'var(--color-blue)' },
      { key: 'clarity' as const, label: 'Clarity', icon: FileText, color: 'var(--color-purple)' },
    ];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="text-center py-6 p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="text-4xl mb-2">{result.score >= 80 ? '✨' : result.score >= 60 ? '📝' : '📖'}</div>
          <p className="text-2xl font-bold" style={{
            color: result.score >= 80 ? 'var(--color-green)' : result.score >= 60 ? 'var(--color-orange)' : 'var(--color-red)',
          }}>{result.score}/100</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{result.feedback}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {dims.map(d => {
            const val = result[d.key];
            return (
              <div key={d.key} className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
                <d.icon size={14} className="mx-auto mb-1" style={{ color: d.color }} />
                <p className="text-[10px] uppercase font-bold" style={{ color: d.color }}>{d.label}</p>
                <div className="flex gap-0.5 mt-1.5 justify-center">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-3 h-1.5 rounded-full" style={{
                      background: i <= val ? d.color : 'var(--color-bg-hover)',
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {result.vocabUsage > 0 && (
          <div className="p-2.5 rounded-lg bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 text-center">
            <p className="text-[10px] uppercase font-bold text-[var(--color-purple)]">
              Vocabulary Bonus: {result.vocabUsage}/5 words used!
            </p>
          </div>
        )}

        {/* Your summary vs model */}
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mb-1">Your Summary</p>
            <p className="text-xs text-[var(--color-text-secondary)]">&ldquo;{summaryInput}&rdquo;</p>
          </div>
          {result.modelSummary && (
            <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle size={10} /> Model Summary
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] italic">&ldquo;{result.modelSummary}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Missed points */}
        {result.missedPoints?.length > 0 && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-orange)] tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> Missed Points
            </p>
            {result.missedPoints.map((p, i) => (
              <p key={i} className="text-xs text-[var(--color-text-secondary)] mb-0.5">• {p}</p>
            ))}
          </div>
        )}

        <button
          onClick={() => { setPhase('idle'); setPassage(null); }}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          Try Another Passage
        </button>
      </motion.div>
    );
  }

  return null;
}
