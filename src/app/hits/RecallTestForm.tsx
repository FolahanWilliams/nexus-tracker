'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff, Loader2, Brain } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface Props {
    onComplete?: () => void;
}

interface FieldScores {
    name: number;
    definition: number;
    mechanism: number;
    example: number;
    actionRule: number;
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
    const [aiFeedback, setAiFeedback] = useState('');
    const [fieldScores, setFieldScores] = useState<FieldScores | null>(null);
    const [loading, setLoading] = useState(false);

    const selectedCard = modelCards.find((c) => c.id === modelCardId);
    const canSubmit = modelCardId && recalledDefinition.trim();

    const handleSubmit = async () => {
        if (!canSubmit || !selectedCard) return;
        setLoading(true);

        let finalScore = 0;
        let feedback = '';

        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'score_recall',
                    originalFields: {
                        name: selectedCard.name,
                        definition: selectedCard.definition,
                        mechanism: selectedCard.coreMechanism,
                        example: Object.values(selectedCard.examples).join(' '),
                        actionRule: selectedCard.actionRule,
                    },
                    recalledFields: {
                        name: recalledName.trim(),
                        definition: recalledDefinition.trim(),
                        mechanism: recalledMechanism.trim(),
                        example: recalledExample.trim(),
                        actionRule: recalledActionRule.trim(),
                    },
                }),
            });
            const data = await res.json();
            finalScore = data.score ?? 0;
            feedback = data.feedback ?? '';
            if (data.fieldScores) setFieldScores(data.fieldScores);
        } catch {
            // Fallback to simple word overlap if AI is unavailable
            finalScore = computeFallbackScore();
            feedback = 'AI scoring unavailable — used basic word matching.';
        }

        setScore(finalScore);
        setAiFeedback(feedback);
        setSubmitted(true);
        setLoading(false);

        addRecallTest({
            modelCardId,
            recalledName: recalledName.trim(),
            recalledDefinition: recalledDefinition.trim(),
            recalledMechanism: recalledMechanism.trim(),
            recalledExample: recalledExample.trim(),
            recalledActionRule: recalledActionRule.trim(),
            score: finalScore,
            aiFeedback: feedback || undefined,
        });
        onComplete?.();
    };

    const computeFallbackScore = (): number => {
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
            const recalledWords = new Set(f.recalled.toLowerCase().split(/\s+/));
            const originalWords = f.original.toLowerCase().split(/\s+/);
            const matchCount = originalWords.filter(w => recalledWords.has(w)).length;
            const overlap = originalWords.length > 0 ? matchCount / originalWords.length : 0;
            s += Math.round(Math.min(1, overlap * 1.5) * f.weight);
        }
        return Math.min(100, s);
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    const scoreColor = (s: number) => s >= 70 ? 'text-[var(--color-green)]' : s >= 40 ? 'text-[var(--color-yellow)]' : 'text-red-400';
    const scoreBg = (s: number) => s >= 70 ? 'bg-green-500/10 border-green-500/30' : s >= 40 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Block E: Active Recall Test (10 min)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
                Close everything. No notes. Write down what you remember. AI will score your recall based on semantic understanding, not exact wording.
            </p>

            {modelCards.length > 0 && (
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Select Model to Recall</span>
                    <select
                        value={modelCardId}
                        onChange={(e) => { setModelCardId(e.target.value); setShowAnswers(false); setSubmitted(false); setFieldScores(null); setAiFeedback(''); }}
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
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                        Model Name
                        {fieldScores && <span className={`ml-2 ${scoreColor(fieldScores.name * 5)}`}>({fieldScores.name}/20)</span>}
                    </span>
                    <input value={recalledName} onChange={(e) => setRecalledName(e.target.value)} placeholder="What was the model called?" className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                        Definition
                        {fieldScores && <span className={`ml-2 ${scoreColor(fieldScores.definition * 4)}`}>({fieldScores.definition}/25)</span>}
                    </span>
                    <textarea value={recalledDefinition} onChange={(e) => setRecalledDefinition(e.target.value)} placeholder="Define it in your own words..." rows={2} className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                        Core Mechanism
                        {fieldScores && <span className={`ml-2 ${scoreColor(fieldScores.mechanism * 4)}`}>({fieldScores.mechanism}/25)</span>}
                    </span>
                    <textarea value={recalledMechanism} onChange={(e) => setRecalledMechanism(e.target.value)} placeholder="How does it work?" rows={2} className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                        One Example
                        {fieldScores && <span className={`ml-2 ${scoreColor(fieldScores.example * (100 / 15))}`}>({fieldScores.example}/15)</span>}
                    </span>
                    <textarea value={recalledExample} onChange={(e) => setRecalledExample(e.target.value)} placeholder="Give one example..." rows={2} className={inputCls} />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                        Action Rule
                        {fieldScores && <span className={`ml-2 ${scoreColor(fieldScores.actionRule * (100 / 15))}`}>({fieldScores.actionRule}/15)</span>}
                    </span>
                    <input value={recalledActionRule} onChange={(e) => setRecalledActionRule(e.target.value)} placeholder="What should you do?" className={inputCls} />
                </label>
            </div>

            {submitted && (
                <div className={`p-4 rounded-lg border ${scoreBg(score)}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Brain size={16} className={scoreColor(score)} />
                        <p className={`text-lg font-bold ${scoreColor(score)}`}>Semantic Recall Score: {score}/100</p>
                    </div>
                    {aiFeedback && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{aiFeedback}</p>
                    )}
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
                disabled={!canSubmit || submitted || loading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {loading ? 'AI Scoring...' : submitted ? 'Submitted' : 'Submit Recall Test'}
            </button>
        </motion.div>
    );
}
