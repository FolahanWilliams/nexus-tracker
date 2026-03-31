'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Save } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { KnowledgePillar } from '@/store/types';

interface Props {
    pillar: KnowledgePillar;
    onComplete?: () => void;
}

export default function ModelCardForm({ pillar, onComplete }: Props) {
    const addModelCard = useGameStore((s) => s.addModelCard);
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

    const handleSubmit = () => {
        if (!canSubmit) return;
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

            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Save size={16} />
                Save Model Card
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
