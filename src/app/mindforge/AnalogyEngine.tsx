'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Lightbulb, ArrowRight, Sparkles, Star, Eye } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

interface AnalogyResult {
  score: number;
  creativity: number;
  depth: number;
  clarity: number;
  vocabUsage: number;
  feedback: string;
  exampleAnalogy: string;
}

interface AnalogyPrompt {
  conceptA: string;
  conceptB: string;
  difficulty: string;
  hint: string;
}

export default function AnalogyEngine({ vocabWords }: { vocabWords: string[] }) {
  const { addXP, logActivity } = useGameStore();
  const { addToast } = useToastStore();

  const [phase, setPhase] = useState<'idle' | 'loading' | 'writing' | 'grading' | 'result'>('idle');
  const [prompts, setPrompts] = useState<AnalogyPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<AnalogyPrompt | null>(null);
  const [analogyInput, setAnalogyInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<AnalogyResult | null>(null);

  const generatePrompts = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analogy', action: 'generate_prompt', vocabWords: vocabWords.slice(0, 15) }),
      });
      const data = await res.json();
      if (data.prompts?.length > 0) {
        setPrompts(data.prompts);
        setPhase('idle');
      } else {
        addToast('Could not generate prompts.', 'error');
        setPhase('idle');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('idle');
    }
  };

  const startWriting = (prompt: AnalogyPrompt) => {
    setSelectedPrompt(prompt);
    setAnalogyInput('');
    setShowHint(false);
    setResult(null);
    setPhase('writing');
  };

  const submitAnalogy = async () => {
    if (!analogyInput.trim() || !selectedPrompt) return;
    setPhase('grading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analogy', action: 'evaluate',
          conceptA: selectedPrompt.conceptA, conceptB: selectedPrompt.conceptB,
          analogy: analogyInput,
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
        logActivity('xp_earned', '💡', `Analogy Engine: ${data.result.score}/100`, `${selectedPrompt.conceptA} ↔ ${selectedPrompt.conceptB}`);
      } else {
        addToast('Could not evaluate analogy.', 'error');
        setPhase('writing');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('writing');
    }
  };

  // ── IDLE ──
  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-[var(--color-orange)]" />
            <h2 className="text-sm font-bold">Analogy Engine</h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Explain how two seemingly different concepts are alike. Building analogies strengthens conceptual thinking and makes your communication more compelling.
          </p>

          {prompts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Choose a pair</p>
              {prompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => startWriting(p)}
                  className="w-full text-left p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] hover:border-[var(--color-orange)]/40 transition-all"
                >
                  <p className="text-sm text-white">
                    How is <span className="font-bold text-[var(--color-orange)]">{p.conceptA}</span> like <span className="font-bold text-[var(--color-orange)]">{p.conceptB}</span>?
                  </p>
                  <span className="text-[9px] uppercase font-bold mt-1 inline-block px-1.5 py-0.5 rounded" style={{
                    color: p.difficulty === 'beginner' ? 'var(--color-green)' : p.difficulty === 'intermediate' ? 'var(--color-blue)' : 'var(--color-orange)',
                    background: p.difficulty === 'beginner' ? 'rgba(74,222,128,0.1)' : p.difficulty === 'intermediate' ? 'rgba(59,130,246,0.1)' : 'rgba(251,146,60,0.1)',
                  }}>{p.difficulty}</span>
                </button>
              ))}
              <button onClick={generatePrompts} className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">
                Generate new pairs
              </button>
            </div>
          ) : (
            <button
              onClick={generatePrompts}
              className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-orange)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Lightbulb size={14} /> Generate Analogy Prompts
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LOADING / GRADING ──
  if (phase === 'loading' || phase === 'grading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="text-sm">{phase === 'grading' ? 'Evaluating your analogy...' : 'Generating prompts...'}</p>
      </div>
    );
  }

  // ── WRITING ──
  if (phase === 'writing' && selectedPrompt) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-orange)]/10 border border-[var(--color-orange)]/20 text-center">
          <p className="text-[10px] uppercase font-bold text-[var(--color-orange)] tracking-wider mb-2">Your Challenge</p>
          <p className="text-lg text-white">
            How is <span className="font-bold text-[var(--color-orange)]">{selectedPrompt.conceptA}</span> like <span className="font-bold text-[var(--color-orange)]">{selectedPrompt.conceptB}</span>?
          </p>
          {showHint ? (
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 italic">{selectedPrompt.hint}</p>
          ) : (
            <button onClick={() => setShowHint(true)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-orange)] mt-2 transition-colors flex items-center gap-1 mx-auto">
              <Eye size={10} /> Show hint
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
            Your Analogy
          </label>
          <textarea
            value={analogyInput}
            onChange={e => setAnalogyInput(e.target.value)}
            placeholder="Explain the connection between these two concepts..."
            autoFocus
            className="w-full p-3 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-white resize-none focus:outline-none focus:border-[var(--color-orange)]"
            rows={5}
          />
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Tip: Go beyond surface similarities. Explain the underlying structure both concepts share.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setPhase('idle')} className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={submitAnalogy}
            disabled={!analogyInput.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-orange)] text-white hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            Submit Analogy <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && result && selectedPrompt) {
    const dims = [
      { key: 'creativity' as const, label: 'Creativity', icon: Sparkles, color: 'var(--color-purple)' },
      { key: 'depth' as const, label: 'Depth', icon: Lightbulb, color: 'var(--color-orange)' },
      { key: 'clarity' as const, label: 'Clarity', icon: Star, color: 'var(--color-blue)' },
    ];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="text-center py-6 p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="text-4xl mb-2">{result.score >= 80 ? '🌟' : result.score >= 60 ? '💡' : '🤔'}</div>
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

        {result.exampleAnalogy && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles size={10} /> Expert Example
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] italic">&ldquo;{result.exampleAnalogy}&rdquo;</p>
          </div>
        )}

        <button
          onClick={() => { setPhase('idle'); setPrompts([]); }}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          Try Another Analogy
        </button>
      </motion.div>
    );
  }

  return null;
}
