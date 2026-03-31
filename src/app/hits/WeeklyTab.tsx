'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Mic, Dumbbell } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export default function WeeklyTab() {
    const addWeeklySynthesis = useGameStore((s) => s.addWeeklySynthesis);
    const syntheses = useGameStore((s) => s.hitsWeeklySyntheses);
    const modelCards = useGameStore((s) => s.hitsModelCards);

    const [topModel1, setTopModel1] = useState('');
    const [topModel2, setTopModel2] = useState('');
    const [topModel3, setTopModel3] = useState('');
    const [repeatingTheme, setRepeatingTheme] = useState('');
    const [mindChangingModel, setMindChangingModel] = useState('');
    const [recurringMistake, setRecurringMistake] = useState('');
    const [newRule, setNewRule] = useState('');
    const [experiment, setExperiment] = useState('');
    const [speakingTopic, setSpeakingTopic] = useState('');
    const [speakingNotes, setSpeakingNotes] = useState('');
    const [deepWorkTopic, setDeepWorkTopic] = useState('');
    const [deepWorkMinutes, setDeepWorkMinutes] = useState('');

    const canSubmit = repeatingTheme.trim() && newRule.trim();

    const handleSubmit = () => {
        if (!canSubmit) return;
        addWeeklySynthesis({
            weekOf: getMonday(),
            topModels: [topModel1.trim(), topModel2.trim(), topModel3.trim()],
            repeatingTheme: repeatingTheme.trim(),
            mindChangingModel: mindChangingModel.trim(),
            recurringMistake: recurringMistake.trim(),
            newRule: newRule.trim(),
            experiment: experiment.trim(),
            speakingDrillTopic: speakingTopic.trim() || undefined,
            speakingDrillNotes: speakingNotes.trim() || undefined,
            deepWorkSprintTopic: deepWorkTopic.trim() || undefined,
            deepWorkSprintMinutes: deepWorkMinutes ? parseInt(deepWorkMinutes) : undefined,
        });
        // Reset form
        setTopModel1(''); setTopModel2(''); setTopModel3('');
        setRepeatingTheme(''); setMindChangingModel('');
        setRecurringMistake(''); setNewRule(''); setExperiment('');
        setSpeakingTopic(''); setSpeakingNotes('');
        setDeepWorkTopic(''); setDeepWorkMinutes('');
    };

    const inputCls = "w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-purple)]";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Weekly Review</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Consolidate and sharpen. Do this every Sunday.</p>
            </div>

            {/* Model Cards This Week */}
            <div className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)]">Model cards created this week: <strong className="text-[var(--color-text-primary)]">{modelCards.filter(c => c.createdAt >= new Date(getMonday()).toISOString()).length}</strong></p>
            </div>

            {/* Weekly Synthesis Form */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">Weekly Synthesis Page</h3>

                <div className="grid gap-3">
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Top 3 Models Learned</span>
                        <div className="grid gap-2">
                            <input value={topModel1} onChange={(e) => setTopModel1(e.target.value)} placeholder="Model 1..." className={inputCls} />
                            <input value={topModel2} onChange={(e) => setTopModel2(e.target.value)} placeholder="Model 2..." className={inputCls} />
                            <input value={topModel3} onChange={(e) => setTopModel3(e.target.value)} placeholder="Model 3..." className={inputCls} />
                        </div>
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">1 Repeating Theme Across Everything</span>
                        <textarea value={repeatingTheme} onChange={(e) => setRepeatingTheme(e.target.value)} placeholder="What keeps showing up?" rows={2} className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">1 Model That Changed How I Think</span>
                        <input value={mindChangingModel} onChange={(e) => setMindChangingModel(e.target.value)} placeholder="Which model shifted your perspective?" className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">1 Mistake I Keep Making</span>
                        <textarea value={recurringMistake} onChange={(e) => setRecurringMistake(e.target.value)} placeholder="What error keeps recurring?" rows={2} className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">1 New Rule I Will Follow Next Week</span>
                        <input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="My new rule..." className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">1 Experiment I Will Run</span>
                        <input value={experiment} onChange={(e) => setExperiment(e.target.value)} placeholder="What will I test next week?" className={inputCls} />
                    </label>
                </div>

                {/* Speaking Drill */}
                <div className="border-t border-[var(--color-border)] pt-4">
                    <h3 className="text-sm font-bold text-[var(--color-text-secondary)] flex items-center gap-2"><Mic size={14} /> Speaking Drill (30 min)</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-3">Record yourself: &ldquo;Here&apos;s the most useful model I learned this week and how it applies to business.&rdquo; 5 min, no script.</p>
                    <div className="grid gap-2">
                        <input value={speakingTopic} onChange={(e) => setSpeakingTopic(e.target.value)} placeholder="Topic you spoke about..." className={inputCls} />
                        <textarea value={speakingNotes} onChange={(e) => setSpeakingNotes(e.target.value)} placeholder="3 improvements after watching it back..." rows={3} className={inputCls} />
                    </div>
                </div>

                {/* Deep Work Sprint */}
                <div className="border-t border-[var(--color-border)] pt-4">
                    <h3 className="text-sm font-bold text-[var(--color-text-secondary)] flex items-center gap-2"><Dumbbell size={14} /> Deep Work Sprint (60-90 min)</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-3">Choose one pillar and go deep: AI/tech, product design, behavioral science, sales strategy, or market research.</p>
                    <div className="grid grid-cols-[1fr_100px] gap-2">
                        <input value={deepWorkTopic} onChange={(e) => setDeepWorkTopic(e.target.value)} placeholder="Topic / pillar..." className={inputCls} />
                        <input value={deepWorkMinutes} onChange={(e) => setDeepWorkMinutes(e.target.value.replace(/\D/g, ''))} placeholder="Minutes" className={inputCls} />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save size={16} />
                    Save Weekly Synthesis
                </button>
            </motion.div>

            {/* Past Syntheses */}
            {syntheses.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-4">
                    <h3 className="text-sm font-bold text-[var(--color-text-secondary)] mb-3">Past Syntheses</h3>
                    <div className="space-y-2">
                        {syntheses.slice(0, 8).map((s) => (
                            <div key={s.id} className="p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">Week of {s.weekOf}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">Theme: {s.repeatingTheme}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">New Rule: {s.newRule}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function getMonday(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}
