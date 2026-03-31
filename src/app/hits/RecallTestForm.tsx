'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface Props {
    onComplete?: () => void;
}

export default function RecallTestForm({ onComplete }: Props) {
    const addRecallTest = useGameStore((s) => s.addRecallTest);
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const session = useGameStore((s) => s.hitsDailySession);

    const todayCards = modelCards.filter((c) => c.createdAt.startsWith(session?.date ?? ''));
    const defaultCardId = todayCards[0]?.id ?? modelCards[0]?.id ?? '';

    const [modelCardId, setModelCardId] = useState(defaultCardId);
    const [recalledName, setRecalledName] = useState('');
    const [recalledDefinition, setRecalledDefinition] = useState('');
    const [recalledMechanism, setRecalledMechanism] = useState('');
    const [recalledExample, setRecalledExample] = useState('');
    const [recalledActionRule, setRecalledActionRule] = useState('');
    const [showAnswers, setShowAnswers] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const selectedCard = modelCards.find((c) => c.id === modelCardId);
    const canSubmit = modelCardId && recalledDefinition.trim();

    const computeScore = (): number => {
        if (!selectedCard) return 0;
        let s = 0;
        const fields = [
            { recalled: recalledName, original: selectedCard.name, weight: 20 },
            { recalled: recalledDefinition, original: selectedCard.definition, weight: 25 },
            { recalled: recalledMechanism, original: selectedCard.coreMechanism, weight: 25 },
            { recalled: recalledExample, original: Object.values(selectedCard.examples).join(' '), weight: 15 },
            { recalled: recalledActionRule, original: selectedCard.actionRule, weight: 15 },
        ];
        for (const f of fields) {
            if (!f.recalled.trim()) continue;
            // Simple word overlap scoring
            const recalledWords = new Set(f.recalled.toLowerCase().split(/\s+/));
            const originalWords = f.original.toLowerCase().split(/\s+/);
            const matchCount = originalWords.filter(w => recalledWords.has(w)).length;
            const overlap = originalWords.length > 0 ? matchCount / originalWords.length : 0;
            s += Math.round(Math.min(1, overlap * 1.5) * f.weight);
        }
        return Math.min(100, s);
    };

    const handleSubmit = () => {
        if (!canSubmit) return;
        const finalScore = computeScore();
        setScore(finalScore);
        setSubmitted(true);
        addRecallTest({
            modelCardId,
            recalledName: recalledName.trim(),
            recalledDefinition: recalledDefinition.trim(),
            recalledMechanism: recalledMechanism.trim(),
            recalledExample: recalledExample.trim(),
            recalledActionRule: recalledActionRule.trim(),
            score: finalScore,
        });
        onComplete?.();
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Block E: Active Recall Test (10 min)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
                Close everything. No notes. Write down what you remember. If you can&apos;t recall it, your learning didn&apos;t stick.
            </p>

            {modelCards.length > 0 && (
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Select Model to Recall</span>
                    <select
                        value={modelCardId}
                        onChange={(e) => { setModelCardId(e.target.value); setShowAnswers(false); setSubmitted(false); }}
                        className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                    >
                        {modelCards.slice(0, 20).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </label>
            )}

            <div className="grid gap-3">
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Model Name</span>
                    <input value={recalledName} onChange={(e) => setRecalledName(e.target.value)} placeholder="What was the model called?" className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Definition</span>
                    <textarea value={recalledDefinition} onChange={(e) => setRecalledDefinition(e.target.value)} placeholder="Define it in your own words..." rows={2} className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Core Mechanism</span>
                    <textarea value={recalledMechanism} onChange={(e) => setRecalledMechanism(e.target.value)} placeholder="How does it work?" rows={2} className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">One Example</span>
                    <textarea value={recalledExample} onChange={(e) => setRecalledExample(e.target.value)} placeholder="Give one example..." rows={2} className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Action Rule</span>
                    <input value={recalledActionRule} onChange={(e) => setRecalledActionRule(e.target.value)} placeholder="What should you do?" className={inputCls} />
                </label>
            </div>

            {submitted && (
                <div className={`p-4 rounded-lg border ${score >= 70 ? 'bg-green-500/10 border-green-500/30' : score >= 40 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">Recall Score: {score}/100</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {score >= 70 ? 'Strong recall! The learning stuck.' : score >= 40 ? 'Partial recall. Review the model card again.' : 'Weak recall. This model needs more repetition.'}
                    </p>
                </div>
            )}

            {selectedCard && (
                <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                    {showAnswers ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showAnswers ? 'Hide' : 'Show'} Original Answers
                </button>
            )}

            {showAnswers && selectedCard && (
                <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-2">
                    <p><strong>Name:</strong> {selectedCard.name}</p>
                    <p><strong>Definition:</strong> {selectedCard.definition}</p>
                    <p><strong>Mechanism:</strong> {selectedCard.coreMechanism}</p>
                    <p><strong>Action Rule:</strong> {selectedCard.actionRule}</p>
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitted}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Save size={16} />
                {submitted ? 'Submitted' : 'Submit Recall Test'}
            </button>
        </motion.div>
    );
}
