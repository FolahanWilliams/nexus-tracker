'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface Props {
    onComplete?: () => void;
}

export default function TransferDrillForm({ onComplete }: Props) {
    const addTransferDrill = useGameStore((s) => s.addTransferDrill);
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const session = useGameStore((s) => s.hitsDailySession);

    // Default to most recently created model card (from today's Block A)
    const todayCards = modelCards.filter((c) => c.createdAt.startsWith(session?.date ?? ''));
    const defaultCardId = todayCards[0]?.id ?? modelCards[0]?.id ?? '';

    const [modelCardId, setModelCardId] = useState(defaultCardId);
    const [domain1, setDomain1] = useState('');
    const [domain2, setDomain2] = useState('');
    const [domain3, setDomain3] = useState('');
    const [analogy1, setAnalogy1] = useState('');
    const [analogy2, setAnalogy2] = useState('');
    const [analogy3, setAnalogy3] = useState('');
    const [universalPrinciple, setUniversalPrinciple] = useState('');

    const selectedCard = modelCards.find((c) => c.id === modelCardId);
    const canSubmit = modelCardId && analogy1.trim() && analogy2.trim() && analogy3.trim() && universalPrinciple.trim();

    const handleSubmit = () => {
        if (!canSubmit) return;
        addTransferDrill({
            modelCardId,
            domains: [domain1.trim() || 'Domain 1', domain2.trim() || 'Domain 2', domain3.trim() || 'Domain 3'],
            analogies: [analogy1.trim(), analogy2.trim(), analogy3.trim()],
            universalPrinciple: universalPrinciple.trim(),
        });
        onComplete?.();
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Block B: Cross-Domain Translation (15 min)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
                Take today&apos;s model and translate it into 3 different domains. Then extract the universal principle.
            </p>

            {modelCards.length > 0 ? (
                <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Select Model Card</span>
                    <select
                        value={modelCardId}
                        onChange={(e) => setModelCardId(e.target.value)}
                        className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                    >
                        {modelCards.slice(0, 20).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </label>
            ) : (
                <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    Complete Block A first to create a model card.
                </div>
            )}

            {selectedCard && (
                <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-purple)]">{selectedCard.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{selectedCard.definition}</p>
                </div>
            )}

            <div className="text-xs font-bold text-[var(--color-text-secondary)]">3x3 Transfer Drill</div>
            {[
                { domain: domain1, setDomain: setDomain1, analogy: analogy1, setAnalogy: setAnalogy1, num: 1 },
                { domain: domain2, setDomain: setDomain2, analogy: analogy2, setAnalogy: setAnalogy2, num: 2 },
                { domain: domain3, setDomain: setDomain3, analogy: analogy3, setAnalogy: setAnalogy3, num: 3 },
            ].map(({ domain, setDomain, analogy, setAnalogy, num }) => (
                <div key={num} className="grid grid-cols-[120px_1fr] gap-2">
                    <input
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder={`Domain ${num}`}
                        className="bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                    />
                    <input
                        value={analogy}
                        onChange={(e) => setAnalogy(e.target.value)}
                        placeholder={`How does the model apply in this domain?`}
                        className="bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                    />
                </div>
            ))}

            <label className="block">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">What stays the same across all domains? (Universal Principle)</span>
                <textarea
                    value={universalPrinciple}
                    onChange={(e) => setUniversalPrinciple(e.target.value)}
                    placeholder="The universal principle that connects all three..."
                    rows={3}
                    className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]"
                />
            </label>

            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Save size={16} />
                Save Transfer Drill
            </button>
        </motion.div>
    );
}
