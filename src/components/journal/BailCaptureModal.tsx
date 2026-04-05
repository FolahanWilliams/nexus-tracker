'use client';

/**
 * BailCaptureModal — 10-second friction capture for the exact moment of
 * defection. Opened via the floating red "I bailed" button on SlightEdgeTab.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { BailEmotion } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';

const EMOTIONS: { value: BailEmotion; label: string; color: string }[] = [
    { value: 'anxious',     label: 'Anxious',     color: 'var(--color-red, #ef4444)' },
    { value: 'bored',       label: 'Bored',       color: 'var(--color-blue)' },
    { value: 'tired',       label: 'Tired',       color: 'var(--color-orange)' },
    { value: 'avoidant',    label: 'Avoidant',    color: 'var(--color-purple)' },
    { value: 'overwhelmed', label: 'Overwhelmed', color: 'var(--color-yellow, #eab308)' },
    { value: 'other',       label: 'Other',       color: 'var(--color-text-muted)' },
];

interface Props {
    open: boolean;
    onClose: () => void;
}

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function BailCaptureModal({ open, onClose }: Props) {
    const addBail = useGameStore((s) => s.addBail);
    const { addToast } = useToastStore();

    const [chose, setChose] = useState('');
    const [instead, setInstead] = useState('');
    const [emotion, setEmotion] = useState<BailEmotion>('avoidant');
    const [trigger, setTrigger] = useState('');

    const reset = () => {
        setChose('');
        setInstead('');
        setEmotion('avoidant');
        setTrigger('');
    };

    const submit = () => {
        if (!chose.trim() || !instead.trim()) return;
        const today = toLocalDateStr(new Date());
        addBail(today, {
            chose: chose.trim(),
            instead: instead.trim(),
            emotion,
            trigger: trigger.trim(),
        });
        addToast('Bail logged. Pattern added.', 'info');
        reset();
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl border border-red-900/50 shadow-2xl overflow-hidden"
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={20} className="text-red-400" />
                                <h3 className="font-bold text-lg">Bail captured</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            <p className="text-xs text-[var(--color-text-muted)]">
                                10 seconds. No judgment. Just pattern data for the coach to use.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">
                                        I chose
                                    </label>
                                    <input
                                        type="text"
                                        value={chose}
                                        onChange={(e) => setChose(e.target.value)}
                                        placeholder="TikTok"
                                        className="input-field text-sm"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">
                                        Instead of
                                    </label>
                                    <input
                                        type="text"
                                        value={instead}
                                        onChange={(e) => setInstead(e.target.value)}
                                        placeholder="outreach email"
                                        className="input-field text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">
                                    Emotion
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {EMOTIONS.map((e) => (
                                        <button
                                            key={e.value}
                                            onClick={() => setEmotion(e.value)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                emotion === e.value
                                                    ? 'text-white border-transparent'
                                                    : 'text-[var(--color-text-muted)] border-[var(--color-border)]'
                                            }`}
                                            style={emotion === e.value ? { backgroundColor: e.color } : undefined}
                                        >
                                            {e.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">
                                    Trigger (what started it)
                                </label>
                                <input
                                    type="text"
                                    value={trigger}
                                    onChange={(e) => setTrigger(e.target.value)}
                                    placeholder="phone on desk, saw a notification"
                                    className="input-field text-sm"
                                />
                            </div>
                        </div>

                        <div className="px-5 pb-5 flex gap-3">
                            <button onClick={onClose} className="flex-1 rpg-button text-sm py-2.5">
                                Cancel
                            </button>
                            <motion.button
                                onClick={submit}
                                disabled={!chose.trim() || !instead.trim()}
                                className="flex-1 rpg-button text-sm py-2.5 bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                Log bail
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
