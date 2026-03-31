'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { HITS_REFLECTION_QUESTIONS, HITS_COGNITIVE_FAILURES } from '@/lib/constants';
import type { CognitiveFailureMode } from '@/store/types';

interface Props {
    onComplete?: () => void;
}

const FAILURE_MODES = Object.entries(HITS_COGNITIVE_FAILURES) as [CognitiveFailureMode, string][];

export default function ReflectionForm({ onComplete }: Props) {
    const addReflection = useGameStore((s) => s.addReflection);
    const [responses, setResponses] = useState<string[]>(HITS_REFLECTION_QUESTIONS.map(() => ''));
    const [failureMode, setFailureMode] = useState<CognitiveFailureMode>('rushed');
    const [preventionPlan, setPreventionPlan] = useState('');

    const filledCount = responses.filter(r => r.trim()).length;
    const canSubmit = filledCount >= 3 && preventionPlan.trim();

    const handleSubmit = () => {
        if (!canSubmit) return;
        addReflection({
            date: new Date().toISOString().split('T')[0],
            responses: responses.map(r => r.trim()),
            cognitiveFailureMode: failureMode,
            preventionPlan: preventionPlan.trim(),
        });
        onComplete?.();
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Block D: Metacognition Reflection (15 min)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
                This builds self-awareness and self-correction. Answer at least 3 questions honestly.
            </p>

            <div className="grid gap-3">
                {HITS_REFLECTION_QUESTIONS.map((q, i) => (
                    <label key={i} className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">{i + 1}. {q}</span>
                        <textarea
                            value={responses[i]}
                            onChange={(e) => {
                                const next = [...responses];
                                next[i] = e.target.value;
                                setResponses(next);
                            }}
                            placeholder="Your reflection..."
                            rows={2}
                            className={inputCls}
                        />
                    </label>
                ))}
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
                <h4 className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Cognitive Failure Mode (pick one)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FAILURE_MODES.map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFailureMode(key)}
                            className={`text-left px-3 py-2 text-xs rounded-lg border transition-colors ${
                                failureMode === key
                                    ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/10 text-[var(--color-purple)] font-semibold'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <label className="block">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">How will I prevent this tomorrow?</span>
                <textarea
                    value={preventionPlan}
                    onChange={(e) => setPreventionPlan(e.target.value)}
                    placeholder="My prevention plan..."
                    rows={3}
                    className={inputCls}
                />
            </label>

            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Save size={16} />
                Save Reflection ({filledCount}/7 answered)
            </button>
        </motion.div>
    );
}
