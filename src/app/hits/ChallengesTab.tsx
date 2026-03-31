'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Sparkles, Loader2, Trophy, FileText } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export default function ChallengesTab() {
    return (
        <div className="space-y-8">
            <MonthlyChallenge />
            <BiweeklyEssay />
        </div>
    );
}

function MonthlyChallenge() {
    const addMonthlyChallenge = useGameStore((s) => s.addMonthlyChallenge);
    const completeMonthlyChallenge = useGameStore((s) => s.completeMonthlyChallenge);
    const challenges = useGameStore((s) => s.hitsMonthlyChallenges);

    const [topic, setTopic] = useState('');
    const [incentives, setIncentives] = useState('');
    const [compounding, setCompounding] = useState('');
    const [feedbackLoops, setFeedbackLoops] = useState('');
    const [secondOrder, setSecondOrder] = useState('');
    const [loading, setLoading] = useState(false);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentChallenge = challenges.find(c => c.month === currentMonth);

    const handleGenerateTopic = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'generate_challenge_topic' }),
            });
            const data = await res.json();
            if (data.topic) setTopic(data.topic);
        } catch { /* silent */ }
        setLoading(false);
    };

    const handleCreate = () => {
        if (!topic.trim()) return;
        addMonthlyChallenge({
            month: currentMonth,
            topic: topic.trim(),
            analyses: { incentives: '', compounding: '', feedbackLoops: '', secondOrderEffects: '' },
        });
        setTopic('');
    };

    const handleComplete = () => {
        if (!currentChallenge || !incentives.trim()) return;
        // Update analyses then complete
        const store = useGameStore.getState();
        store.hitsMonthlyChallenges.forEach(c => {
            if (c.id === currentChallenge.id) {
                c.analyses = {
                    incentives: incentives.trim(),
                    compounding: compounding.trim(),
                    feedbackLoops: feedbackLoops.trim(),
                    secondOrderEffects: secondOrder.trim(),
                };
            }
        });
        completeMonthlyChallenge(currentChallenge.id);
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[var(--color-purple)]" />
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Monthly Challenge</h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
                Pick a random topic and analyze it through the 4 foundational models: Incentives, Compounding, Feedback Loops, Second-Order Effects.
            </p>

            {!currentChallenge ? (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. war, marketing, sports, religion, AI)" className={inputCls} />
                        <button
                            onClick={handleGenerateTopic}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-purple)]/20 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/30 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Random
                        </button>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!topic.trim()}
                        className="px-4 py-2 text-sm font-bold rounded-lg bg-[var(--color-purple)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                    >
                        Start Challenge
                    </button>
                </div>
            ) : currentChallenge.completed ? (
                <div className="p-4 rounded-lg bg-[var(--color-green)]/10 border border-[var(--color-green)]/30">
                    <p className="text-sm font-bold text-[var(--color-green)]">This month&apos;s challenge completed!</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Topic: {currentChallenge.topic}</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="p-3 rounded-lg bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/30">
                        <p className="text-sm font-bold text-[var(--color-purple)]">Topic: {currentChallenge.topic}</p>
                    </div>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">What are the Incentives?</span>
                        <textarea value={incentives} onChange={(e) => setIncentives(e.target.value)} rows={3} className={inputCls} placeholder="Who benefits? What drives behavior?" />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">What is Compounding?</span>
                        <textarea value={compounding} onChange={(e) => setCompounding(e.target.value)} rows={3} className={inputCls} placeholder="What builds over time?" />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">What are the Feedback Loops?</span>
                        <textarea value={feedbackLoops} onChange={(e) => setFeedbackLoops(e.target.value)} rows={3} className={inputCls} placeholder="What reinforces or collapses?" />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">What are the Second-Order Effects?</span>
                        <textarea value={secondOrder} onChange={(e) => setSecondOrder(e.target.value)} rows={3} className={inputCls} placeholder="What happens after the consequence?" />
                    </label>
                    <button
                        onClick={handleComplete}
                        disabled={!incentives.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                    >
                        <Save size={16} /> Complete Challenge (+200 XP)
                    </button>
                </motion.div>
            )}

            {/* Past challenges */}
            {challenges.filter(c => c.completed).length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-4 mt-4">
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">Past Challenges</h3>
                    {challenges.filter(c => c.completed).slice(0, 6).map(c => (
                        <div key={c.id} className="p-2 rounded bg-[var(--color-bg-dark)] text-xs text-[var(--color-text-muted)] mb-1">
                            {c.month}: {c.topic}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function BiweeklyEssay() {
    const addBiweeklyEssay = useGameStore((s) => s.addBiweeklyEssay);
    const essays = useGameStore((s) => s.hitsBiweeklyEssays);
    const [content, setContent] = useState('');

    const canSubmit = content.trim().length >= 100;

    const handleSubmit = () => {
        if (!canSubmit) return;
        addBiweeklyEssay({
            periodStart: new Date().toISOString().split('T')[0],
            content: content.trim(),
        });
        setContent('');
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    return (
        <div className="space-y-4 border-t border-[var(--color-border)] pt-6">
            <div className="flex items-center gap-2">
                <FileText size={18} className="text-[var(--color-purple)]" />
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Biweekly Synthesis Essay</h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
                Every 2 weeks, write a 1-page essay: &ldquo;What I believe about reality right now.&rdquo; Include what humans are motivated by, how money works, how systems evolve, how people decide, what creates success. Then compare to your last one.
            </p>

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What I believe about reality right now..."
                rows={15}
                className={inputCls}
            />
            <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">{content.split(/\s+/).filter(Boolean).length} words</span>
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                >
                    <Save size={16} /> Save Essay (+150 XP)
                </button>
            </div>

            {essays.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-4">
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">Past Essays</h3>
                    {essays.slice(0, 6).map(e => (
                        <details key={e.id} className="mb-2">
                            <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]">
                                {e.periodStart} ({e.content.split(/\s+/).filter(Boolean).length} words)
                            </summary>
                            <div className="mt-1 p-3 rounded bg-[var(--color-bg-dark)] text-xs text-[var(--color-text-muted)] whitespace-pre-wrap">
                                {e.content}
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
}
