'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, FileText, Briefcase, Megaphone, Loader2, Sparkles } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { HitsOutputType } from '@/store/types';

interface Props {
    onComplete?: () => void;
}

const OUTPUT_MODES: { id: HitsOutputType; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'mini_essay', label: 'Mini Essay', icon: <FileText size={14} />, desc: '300-500 words: What is the most important thing I learned today?' },
    { id: 'founder_memo', label: 'Founder Memo', icon: <Briefcase size={14} />, desc: 'Problem, insight, decision, risk, next step' },
    { id: 'persuasion_pitch', label: 'Persuasion Pitch', icon: <Megaphone size={14} />, desc: '6 sentences: who, pain, why it matters, why now, solution, proof' },
];

export default function OutputForm({ onComplete }: Props) {
    const addHitsOutput = useGameStore((s) => s.addHitsOutput);
    const [mode, setMode] = useState<HitsOutputType>('mini_essay');
    const [essayContent, setEssayContent] = useState('');
    const [memoProblem, setMemoProblem] = useState('');
    const [memoInsight, setMemoInsight] = useState('');
    const [memoDecision, setMemoDecision] = useState('');
    const [memoRisk, setMemoRisk] = useState('');
    const [memoNextStep, setMemoNextStep] = useState('');
    const [pitchSentences, setPitchSentences] = useState(['', '', '', '', '', '']);
    const [aiScore, setAiScore] = useState<number | null>(null);
    const [aiFeedback, setAiFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    const pitchLabels = ['Who is this for?', 'What is their pain?', 'Why does it matter?', 'Why now?', 'What is the solution?', 'What is the proof?'];

    const canSubmit = mode === 'mini_essay'
        ? essayContent.trim().length >= 50
        : mode === 'founder_memo'
            ? memoProblem.trim() && memoInsight.trim()
            : pitchSentences.filter(s => s.trim()).length >= 4;

    const getContent = (): string => {
        if (mode === 'mini_essay') return essayContent.trim();
        if (mode === 'founder_memo') return [memoProblem, memoInsight, memoDecision, memoRisk, memoNextStep].filter(Boolean).join('\n\n');
        return pitchSentences.filter(Boolean).join(' ');
    };

    const handleEvaluate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'evaluate_output', outputType: mode, content: getContent() }),
            });
            const data = await res.json();
            if (data.score != null) setAiScore(data.score);
            if (data.feedback) setAiFeedback(data.feedback);
        } catch { /* silent */ }
        setLoading(false);
    };

    const handleSubmit = () => {
        if (!canSubmit) return;
        addHitsOutput({
            type: mode,
            content: getContent(),
            founderMemo: mode === 'founder_memo' ? {
                problem: memoProblem.trim(),
                insight: memoInsight.trim(),
                decision: memoDecision.trim(),
                risk: memoRisk.trim(),
                nextStep: memoNextStep.trim(),
            } : undefined,
            persuasionPitch: mode === 'persuasion_pitch' ? {
                sentences: pitchSentences.map(s => s.trim()).filter(Boolean),
            } : undefined,
            aiScore: aiScore ?? undefined,
            aiFeedback: aiFeedback || undefined,
        });
        onComplete?.();
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Block C: Output (30 min)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
                Intelligence becomes real through output. Pick a format and produce.
            </p>

            <div className="flex gap-2">
                {OUTPUT_MODES.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                            mode === m.id
                                ? 'bg-[var(--color-purple)]/20 text-[var(--color-purple)] border border-[var(--color-purple)]/30'
                                : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text-secondary)]'
                        }`}
                    >
                        {m.icon} {m.label}
                    </button>
                ))}
            </div>

            <p className="text-xs text-[var(--color-text-muted)] italic">
                {OUTPUT_MODES.find(m => m.id === mode)?.desc}
            </p>

            {mode === 'mini_essay' && (
                <textarea
                    value={essayContent}
                    onChange={(e) => setEssayContent(e.target.value)}
                    placeholder="What is the most important thing I learned today, and how can I apply it?"
                    rows={12}
                    className={inputCls}
                />
            )}

            {mode === 'founder_memo' && (
                <div className="grid gap-3">
                    {[
                        { label: 'Problem', value: memoProblem, set: setMemoProblem },
                        { label: 'Insight', value: memoInsight, set: setMemoInsight },
                        { label: 'Decision', value: memoDecision, set: setMemoDecision },
                        { label: 'Risk', value: memoRisk, set: setMemoRisk },
                        { label: 'Next Step', value: memoNextStep, set: setMemoNextStep },
                    ].map((f) => (
                        <label key={f.label} className="block">
                            <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">{f.label}</span>
                            <textarea value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.label + '...'} rows={2} className={inputCls} />
                        </label>
                    ))}
                </div>
            )}

            {mode === 'persuasion_pitch' && (
                <div className="grid gap-3">
                    {pitchLabels.map((label, i) => (
                        <label key={i} className="block">
                            <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">{label}</span>
                            <input
                                value={pitchSentences[i]}
                                onChange={(e) => {
                                    const next = [...pitchSentences];
                                    next[i] = e.target.value;
                                    setPitchSentences(next);
                                }}
                                placeholder={label}
                                className={inputCls}
                            />
                        </label>
                    ))}
                </div>
            )}

            {aiScore !== null && (
                <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[var(--color-purple)]">AI Score: {aiScore}/100</span>
                    </div>
                    {aiFeedback && <p className="text-xs text-[var(--color-text-muted)]">{aiFeedback}</p>}
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={handleEvaluate}
                    disabled={!canSubmit || loading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-purple)]/20 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/30 transition-colors disabled:opacity-40"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Evaluate
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save size={16} />
                    Save Output
                </button>
            </div>
        </motion.div>
    );
}
