'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';

const STATUS_COLORS: Record<string, string> = {
    new: 'var(--color-text-muted)',
    learning: 'var(--color-yellow)',
    reviewing: 'var(--color-blue)',
    mastered: 'var(--color-green)',
};

export default function SATVocabBank() {
    const vocabWords = useGameStore((s) => s.vocabWords);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const satWords = useMemo(
        () => vocabWords.filter(w => w.category === 'SAT'),
        [vocabWords]
    );

    const filtered = useMemo(() => {
        let result = satWords;
        if (statusFilter !== 'all') result = result.filter(w => w.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(w =>
                w.word.toLowerCase().includes(q) ||
                w.definition.toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => a.word.localeCompare(b.word));
    }, [satWords, statusFilter, search]);

    const stats = useMemo(() => ({
        total: satWords.length,
        mastered: satWords.filter(w => w.status === 'mastered').length,
        learning: satWords.filter(w => w.status === 'learning' || w.status === 'reviewing').length,
        new: satWords.filter(w => w.status === 'new').length,
    }), [satWords]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} className="text-[var(--color-blue)]" />
                    <h2 className="text-sm font-bold">SAT Vocabulary Bank</h2>
                    <span className="text-xs text-[var(--color-text-muted)]">{stats.total} words</span>
                </div>
                <div className="flex gap-3 text-[10px] text-[var(--color-text-muted)]">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-green)] mr-1" />{stats.mastered} mastered</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-yellow)] mr-1" />{stats.learning} learning</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-text-muted)] mr-1" />{stats.new} new</span>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search SAT words..."
                        className="w-full px-3 py-2 pl-8 rounded-lg text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-blue)]"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                >
                    <option value="all">All</option>
                    <option value="new">New</option>
                    <option value="learning">Learning</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="mastered">Mastered</option>
                </select>
            </div>

            {/* Word List */}
            {filtered.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                    {satWords.length === 0 ? 'No SAT words yet. Generate some in Daily Training!' : 'No matching words found.'}
                </div>
            ) : (
                <div className="space-y-1">
                    {filtered.map(w => (
                        <div key={w.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
                            <button
                                onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
                            >
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[w.status] }} />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-white">{w.word}</span>
                                    <span className="text-xs text-[var(--color-text-muted)] ml-2 italic">{w.partOfSpeech}</span>
                                </div>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{w.totalReviews} reviews</span>
                                <ChevronDown size={14} className={`text-[var(--color-text-muted)] transition-transform ${expandedId === w.id ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {expandedId === w.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-3 pb-3 space-y-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-2">
                                            <p>{w.definition}</p>
                                            {w.etymology && <p className="text-[var(--color-text-muted)]"><strong>Etymology:</strong> {w.etymology}</p>}
                                            <p className="text-[var(--color-text-muted)]"><strong>Mnemonic:</strong> {w.mnemonic}</p>
                                            {w.examples?.map((ex, i) => <p key={i} className="italic text-[var(--color-text-muted)]">&ldquo;{ex}&rdquo;</p>)}
                                            {w.relatedWords && w.relatedWords.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {w.relatedWords.map((rw, i) => (
                                                        <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--color-bg-hover)] text-[10px] text-[var(--color-text-muted)]">{rw}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex gap-4 text-[10px] text-[var(--color-text-muted)]">
                                                <span>Reviews: {w.totalReviews}</span>
                                                <span>Correct: {w.correctReviews}</span>
                                                <span>Next: {w.nextReviewDate}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
