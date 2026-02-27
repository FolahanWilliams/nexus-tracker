'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, ChevronRight, Swords, CheckCircle,
  AlertTriangle, Target, Shield, ArrowRight,
} from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

interface ArgumentResult {
  score: number;
  clarity: number;
  logic: number;
  evidence: number;
  rebuttal: number;
  vocabUsage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface Topic {
  topic: string;
  difficulty: string;
}

export default function ArgumentBuilder({ vocabWords }: { vocabWords: string[] }) {
  const { addXP, logActivity } = useGameStore();
  const { addToast } = useToastStore();

  const [phase, setPhase] = useState<'idle' | 'loading' | 'building' | 'grading' | 'result'>('idle');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState('');
  const [counterargument, setCounterargument] = useState('');
  const [rebuttal, setRebuttal] = useState('');
  const [result, setResult] = useState<ArgumentResult | null>(null);

  const generateTopics = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'argument', action: 'generate_topic', vocabWords: vocabWords.slice(0, 15) }),
      });
      const data = await res.json();
      if (data.topics?.length > 0) {
        setTopics(data.topics);
        setPhase('idle');
      } else {
        addToast('Could not generate topics.', 'error');
        setPhase('idle');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('idle');
    }
  };

  const startBuilding = (topic: string) => {
    setSelectedTopic(topic);
    setClaim('');
    setEvidence('');
    setCounterargument('');
    setRebuttal('');
    setResult(null);
    setPhase('building');
  };

  const submitArgument = async () => {
    if (!claim.trim() || !evidence.trim() || !counterargument.trim() || !rebuttal.trim()) {
      addToast('Please fill in all four fields.', 'info');
      return;
    }
    setPhase('grading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'argument', action: 'evaluate',
          topic: selectedTopic, claim, evidence, counterargument, rebuttal,
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
        logActivity('xp_earned', '⚔️', `Argument Builder: ${data.result.score}/100`, selectedTopic.slice(0, 50));
      } else {
        addToast('Could not evaluate argument.', 'error');
        setPhase('building');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('building');
    }
  };

  const DIMENSION_CONFIG = [
    { key: 'clarity', label: 'Clarity', icon: Target, color: 'var(--color-blue)' },
    { key: 'logic', label: 'Logic', icon: ChevronRight, color: 'var(--color-green)' },
    { key: 'evidence', label: 'Evidence', icon: AlertTriangle, color: 'var(--color-orange)' },
    { key: 'rebuttal', label: 'Rebuttal', icon: Shield, color: 'var(--color-purple)' },
  ] as const;

  // ── IDLE ──
  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Swords size={18} className="text-[var(--color-red)]" />
            <h2 className="text-sm font-bold">Argument Builder</h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Build a structured argument: claim, evidence, counterargument, and rebuttal. AI evaluates your reasoning, clarity, and persuasiveness.
          </p>

          {topics.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Choose a topic</p>
              {topics.map((t, i) => (
                <button
                  key={i}
                  onClick={() => startBuilding(t.topic)}
                  className="w-full text-left p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] hover:border-[var(--color-red)]/40 transition-all"
                >
                  <p className="text-sm text-white">{t.topic}</p>
                  <span className="text-[9px] uppercase font-bold mt-1 inline-block px-1.5 py-0.5 rounded" style={{
                    color: t.difficulty === 'beginner' ? 'var(--color-green)' : t.difficulty === 'intermediate' ? 'var(--color-blue)' : 'var(--color-orange)',
                    background: t.difficulty === 'beginner' ? 'rgba(74,222,128,0.1)' : t.difficulty === 'intermediate' ? 'rgba(59,130,246,0.1)' : 'rgba(251,146,60,0.1)',
                  }}>{t.difficulty}</span>
                </button>
              ))}
              <button onClick={generateTopics} className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">
                Generate new topics
              </button>
            </div>
          ) : (
            <button
              onClick={generateTopics}
              className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-red)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Swords size={14} /> Generate Debate Topics
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (phase === 'loading' || phase === 'grading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="text-sm">{phase === 'grading' ? 'Evaluating your argument...' : 'Generating topics...'}</p>
      </div>
    );
  }

  // ── BUILDING ──
  if (phase === 'building') {
    const fields = [
      { key: 'claim', label: 'Your Claim', placeholder: 'State your position clearly...', value: claim, set: setClaim, icon: Target, color: 'var(--color-blue)', hint: 'A clear, specific statement of your position' },
      { key: 'evidence', label: 'Evidence', placeholder: 'Support your claim with evidence...', value: evidence, set: setEvidence, icon: AlertTriangle, color: 'var(--color-green)', hint: 'Facts, examples, data, or reasoning that supports your claim' },
      { key: 'counter', label: 'Counterargument', placeholder: 'What would someone argue against you?', value: counterargument, set: setCounterargument, icon: Shield, color: 'var(--color-orange)', hint: 'The strongest argument against your position' },
      { key: 'rebuttal', label: 'Rebuttal', placeholder: 'How do you respond to the counterargument?', value: rebuttal, set: setRebuttal, icon: Swords, color: 'var(--color-red)', hint: 'Address and overcome the counterargument' },
    ];

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-[var(--color-red)]/10 border border-[var(--color-red)]/20">
          <p className="text-[10px] uppercase font-bold text-[var(--color-red)] tracking-wider mb-1">Topic</p>
          <p className="text-sm text-white">{selectedTopic}</p>
        </div>

        {fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1" style={{ color: f.color }}>
              <f.icon size={11} /> {f.label}
            </label>
            <p className="text-[10px] text-[var(--color-text-muted)]">{f.hint}</p>
            <textarea
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full p-3 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-white resize-none focus:outline-none"
              style={{ borderColor: f.value.trim() ? f.color : undefined }}
              rows={3}
            />
          </div>
        ))}

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('idle')}
            className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submitArgument}
            disabled={!claim.trim() || !evidence.trim() || !counterargument.trim() || !rebuttal.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-red)] text-white hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            Submit Argument <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Score header */}
        <div className="text-center py-6 p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="text-4xl mb-2">{result.score >= 80 ? '🏆' : result.score >= 60 ? '💪' : '📖'}</div>
          <p className="text-2xl font-bold" style={{
            color: result.score >= 80 ? 'var(--color-green)' : result.score >= 60 ? 'var(--color-orange)' : 'var(--color-red)',
          }}>{result.score}/100</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{result.feedback}</p>
        </div>

        {/* Dimension scores */}
        <div className="grid grid-cols-2 gap-2">
          {DIMENSION_CONFIG.map(d => {
            const val = result[d.key];
            return (
              <div key={d.key} className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <d.icon size={12} style={{ color: d.color }} />
                  <span className="text-[10px] uppercase font-bold" style={{ color: d.color }}>{d.label}</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex-1 h-1.5 rounded-full" style={{
                      background: i <= val ? d.color : 'var(--color-bg-hover)',
                    }} />
                  ))}
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">{val}/5</span>
              </div>
            );
          })}
        </div>

        {/* Vocab usage bonus */}
        {result.vocabUsage > 0 && (
          <div className="p-2.5 rounded-lg bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 text-center">
            <p className="text-[10px] uppercase font-bold text-[var(--color-purple)]">
              Vocabulary Bonus: {result.vocabUsage}/5 words used naturally!
            </p>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle size={10} /> Strengths
            </p>
            {result.strengths?.map((s, i) => (
              <p key={i} className="text-xs text-[var(--color-text-secondary)] mb-1">• {s}</p>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-orange)] tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> Improve
            </p>
            {result.improvements?.map((s, i) => (
              <p key={i} className="text-xs text-[var(--color-text-secondary)] mb-1">• {s}</p>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setPhase('idle'); setTopics([]); }}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          Try Another Topic
        </button>
      </motion.div>
    );
  }

  return null;
}
