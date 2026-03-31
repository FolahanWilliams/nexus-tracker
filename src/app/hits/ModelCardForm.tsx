'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Save, AlertTriangle, Merge, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { KnowledgePillar } from '@/store/types';

interface Props {
    pillar: KnowledgePillar;
    onComplete?: () => void;
}

interface ConflictResult {
    hasConflict: boolean;
    conflictType: 'duplicate' | 'contradicts' | 'overlapping' | null;
    conflictingCardId: string | null;
    conflictingCardName: string | null;
    explanation: string | null;
    mergedCard: {
        name: string;
        definition: string;
        coreMechanism: string;
        limitations: string;
        actionRule: string;
        keyQuestion: string;
    } | null;
}

export default function ModelCardForm({ pillar, onComplete }: Props) {
    const addModelCard = useGameStore((s) => s.addModelCard);
    const deleteModelCard = useGameStore((s) => s.deleteModelCard);
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const [name, setName] = useState('');
    const [definition, setDefinition] = useState('');
    const [coreMechanism, setCoreMechanism] = useState('');
    const [exHistory, setExHistory] = useState('');
    const [exBusiness, setExBusiness] = useState('');
    const [exStartups, setExStartups] = useState('');
    const [exPersonal, setExPersonal] = useState('');
    const [limitations, setLimitations] = useState('');
    const [actionRule, setActionRule] = useState('');
    const [keyQuestion, setKeyQuestion] = useState('');
    const [loading, setLoading] = useState(false);

    // Conflict detection state
    const [checkingConflict, setCheckingConflict] = useState(false);
    const [conflict, setConflict] = useState<ConflictResult | null>(null);

    const canSubmit = name.trim() && definition.trim() && coreMechanism.trim();

    const handleSuggest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'suggest_model', pillar }),
            });
            const data = await res.json();
            if (data.name) setName(data.name);
            if (data.definition) setDefinition(data.definition);
            if (data.coreMechanism) setCoreMechanism(data.coreMechanism);
            if (data.examples) {
                setExHistory(data.examples.history || '');
                setExBusiness(data.examples.business || '');
                setExStartups(data.examples.startups || '');
                setExPersonal(data.examples.personal || '');
            }
            if (data.limitations) setLimitations(data.limitations);
            if (data.actionRule) setActionRule(data.actionRule);
            if (data.keyQuestion) setKeyQuestion(data.keyQuestion);
        } catch { /* silent */ }
        setLoading(false);
    };

    const checkForConflicts = async (): Promise<boolean> => {
        if (modelCards.length === 0) return false;

        setCheckingConflict(true);
        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'detect_conflicts',
                    newCard: {
                        name: name.trim(),
                        definition: definition.trim(),
                        coreMechanism: coreMechanism.trim(),
                    },
                    existingCards: modelCards.slice(0, 30).map(c => ({
                        id: c.id,
                        name: c.name,
                        definition: c.definition,
                        coreMechanism: c.coreMechanism,
                    })),
                }),
            });
            const data = await res.json() as ConflictResult;
            if (data.hasConflict) {
                setConflict(data);
                setCheckingConflict(false);
                return true;
            }
        } catch { /* proceed without conflict check */ }
        setCheckingConflict(false);
        return false;
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        // Check for conflicts before saving
        const hasConflict = await checkForConflicts();
        if (hasConflict) return; // Show conflict UI instead

        saveCard();
    };

    const saveCard = () => {
        addModelCard({
            name: name.trim(),
            definition: definition.trim(),
            coreMechanism: coreMechanism.trim(),
            examples: {
                history: exHistory.trim(),
                business: exBusiness.trim(),
                startups: exStartups.trim(),
                personal: exPersonal.trim(),
            },
            limitations: limitations.trim(),
            actionRule: actionRule.trim(),
            keyQuestion: keyQuestion.trim(),
            pillar,
        });
        onComplete?.();
    };

    const handleMerge = () => {
        if (!conflict?.mergedCard || !conflict.conflictingCardId) return;

        // Delete the old conflicting card
        deleteModelCard(conflict.conflictingCardId);

        // Find the old card's examples to preserve them
        const oldCard = modelCards.find(c => c.id === conflict.conflictingCardId);

        // Save merged card with combined examples
        addModelCard({
            name: conflict.mergedCard.name,
            definition: conflict.mergedCard.definition,
            coreMechanism: conflict.mergedCard.coreMechanism,
            examples: {
                history: exHistory.trim() || oldCard?.examples.history || '',
                business: exBusiness.trim() || oldCard?.examples.business || '',
                startups: exStartups.trim() || oldCard?.examples.startups || '',
                personal: exPersonal.trim() || oldCard?.examples.personal || '',
            },
            limitations: conflict.mergedCard.limitations || limitations.trim(),
            actionRule: conflict.mergedCard.actionRule || actionRule.trim(),
            keyQuestion: conflict.mergedCard.keyQuestion || keyQuestion.trim(),
            pillar,
        });

        setConflict(null);
        onComplete?.();
    };

    const handleSaveAnyway = () => {
        setConflict(null);
        saveCard();
    };

    const conflictColors: Record<string, { bg: string; border: string; text: string }> = {
        duplicate: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
        contradicts: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
        overlapping: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Block A: Model Card (20 min)</h3>
                <button
                    onClick={handleSuggest}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-purple)]/20 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/30 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Suggest
                </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
                Read or consume one high-quality input, then compress it into a model card.
            </p>

            <div className="grid gap-3">
                <Field label="Model Name" value={name} onChange={setName} placeholder="e.g. Incentives, Compounding, Feedback Loops" />
                <Field label="Definition (1 sentence)" value={definition} onChange={setDefinition} placeholder="What is this model in one sentence?" />
                <Field label="Core Mechanism" value={coreMechanism} onChange={setCoreMechanism} placeholder="How does it work?" multiline />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Example in History" value={exHistory} onChange={setExHistory} placeholder="Historical example..." multiline />
                    <Field label="Example in Business" value={exBusiness} onChange={setExBusiness} placeholder="Business example..." multiline />
                    <Field label="Example in Startups" value={exStartups} onChange={setExStartups} placeholder="Startup example..." multiline />
                    <Field label="Example in Your Life" value={exPersonal} onChange={setExPersonal} placeholder="Personal example..." multiline />
                </div>
                <Field label="Limitations / How it Fails" value={limitations} onChange={setLimitations} placeholder="When does this model break down?" multiline />
                <Field label="Action Rule (so what do I do?)" value={actionRule} onChange={setActionRule} placeholder="One actionable takeaway..." />
                <Field label="Key Question This Model Answers" value={keyQuestion} onChange={setKeyQuestion} placeholder="What question does this help answer?" />
            </div>

            {/* Conflict Detection Modal */}
            <AnimatePresence>
                {conflict && conflict.hasConflict && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`p-4 rounded-xl border ${conflictColors[conflict.conflictType || 'overlapping']?.bg} ${conflictColors[conflict.conflictType || 'overlapping']?.border}`}
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <AlertTriangle size={18} className={conflictColors[conflict.conflictType || 'overlapping']?.text} />
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${conflictColors[conflict.conflictType || 'overlapping']?.text}`}>
                                    {conflict.conflictType === 'duplicate' ? 'Duplicate Detected' :
                                     conflict.conflictType === 'contradicts' ? 'Contradiction Found' :
                                     'Significant Overlap'}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    Conflicts with: <strong className="text-[var(--color-text-secondary)]">{conflict.conflictingCardName}</strong>
                                </p>
                                {conflict.explanation && (
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{conflict.explanation}</p>
                                )}
                            </div>
                            <button onClick={() => setConflict(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                                <X size={16} />
                            </button>
                        </div>

                        {conflict.mergedCard && (
                            <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] mb-3">
                                <p className="text-[10px] font-bold text-[var(--color-purple)] uppercase tracking-wider mb-2">AI-Proposed Merged Card</p>
                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{conflict.mergedCard.name}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">{conflict.mergedCard.definition}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1"><strong>Mechanism:</strong> {conflict.mergedCard.coreMechanism}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {conflict.mergedCard && (
                                <button
                                    onClick={handleMerge}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-[var(--color-purple)] text-white hover:brightness-110 transition-all"
                                >
                                    <Merge size={14} />
                                    Merge Cards
                                </button>
                            )}
                            <button
                                onClick={handleSaveAnyway}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors"
                            >
                                Save Anyway
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={handleSubmit}
                disabled={!canSubmit || checkingConflict}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {checkingConflict ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {checkingConflict ? 'Checking for conflicts...' : 'Save Model Card'}
            </button>
        </motion.div>
    );
}

function Field({ label, value, onChange, placeholder, multiline }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean;
}) {
    const cls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";
    return (
        <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">{label}</span>
            {multiline ? (
                <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
            ) : (
                <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
            )}
        </label>
    );
}
