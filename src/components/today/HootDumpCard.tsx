'use client';

/**
 * HootDumpCard — the "Tell Hoot about your day" input at the top of /today.
 *
 * Accepts voice (push-to-talk via useVoiceDump → Whisper) or typed word-dumps,
 * POSTs them to /api/hoot-action with contextMode='daily_dump' so Gemini emits
 * multiple tool calls in one turn. Before running the returned actions we
 * snapshot the game-store state; after running we show a compact receipt with
 * a 10-second Undo that restores the snapshot.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Loader2, Sparkles, Undo2, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useHootStore } from '@/store/useHootStore';
import { useToastStore } from '@/components/ToastContainer';
import { executeHootActions } from '@/components/hoot/HootActionExecutor';
import { useVoiceDump } from '@/hooks/useVoiceDump';
import { buildPlayerNarrative } from '@/lib/hootNarrative';
import { logger } from '@/lib/logger';
import type { HootAction } from '@/store/useHootStore';

const UNDO_WINDOW_MS = 10_000;

// Keys we snapshot before applying dump actions so Undo can roll them back.
const SNAPSHOT_KEYS = [
    'tasks',
    'habits',
    'goals',
    'dailyCalendarEntries',
    'identityLine',
    'identityVotes',
    'ifThenPlans',
    'knowledgeNodes',
    'knowledgeEdges',
    'todayIntention',
    'lastIntentionDate',
    'lastIntentionEnergy',
    'xp',
    'gold',
    'level',
    'streak',
    'hootMemory',
    'focusSessionsTotal',
    'focusMinutesTotal',
    'inventory',
    'shopItems',
    'bossBattles',
    'vocabWords',
    'reflectionNotes',
] as const;

type SnapshotKey = typeof SNAPSHOT_KEYS[number];
type StateSnapshot = Partial<Record<SnapshotKey, unknown>>;

function captureSnapshot(): StateSnapshot {
    const state = useGameStore.getState() as unknown as Record<string, unknown>;
    const snap: StateSnapshot = {};
    for (const key of SNAPSHOT_KEYS) {
        if (key in state) {
            // Structured clone preserves nested arrays/objects, Dates, etc.
            try {
                snap[key] = structuredClone(state[key]);
            } catch {
                snap[key] = JSON.parse(JSON.stringify(state[key] ?? null));
            }
        }
    }
    return snap;
}

function restoreSnapshot(snap: StateSnapshot) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useGameStore.setState(snap as any);
}

interface Receipt {
    snapshot: StateSnapshot;
    results: string[];
    message: string;
    expiresAt: number;
}

export default function HootDumpCard() {
    const router = useRouter();
    const { addToast } = useToastStore();
    const setPlanningContext = useHootStore((s) => s.setPlanningContext);

    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [countdown, setCountdown] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { isRecording, transcribing, supported, startRecording, stopRecording } = useVoiceDump({
        onTranscript: (transcript) => {
            setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
            textareaRef.current?.focus();
        },
    });

    // Countdown tick for the Undo window
    useEffect(() => {
        if (!receipt) return;
        const tick = () => {
            const left = Math.max(0, Math.ceil((receipt.expiresAt - Date.now()) / 1000));
            setCountdown(left);
            if (left === 0) {
                setReceipt(null);
            }
        };
        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [receipt]);

    const submit = useCallback(async () => {
        const dump = text.trim();
        if (!dump || loading) return;
        setLoading(true);
        try {
            const context = buildPlayerNarrative(useGameStore.getState(), '/today');
            const res = await fetch('/api/hoot-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: dump,
                    currentPage: '/today',
                    context,
                    contextMode: 'daily_dump',
                }),
            });
            const data = await res.json();
            const actions: HootAction[] = data.actions || [];
            const snapshot = captureSnapshot();

            let results: string[] = [];
            if (actions.length > 0) {
                results = await executeHootActions(actions, {
                    router,
                    addToast,
                    setPlanningContext,
                });
            }

            if (actions.length === 0) {
                addToast('Hoot couldn\'t extract any data points from that dump.', 'info');
                setText('');
            } else {
                setReceipt({
                    snapshot,
                    results,
                    message: data.message || `Captured ${actions.length} data point${actions.length === 1 ? '' : 's'}.`,
                    expiresAt: Date.now() + UNDO_WINDOW_MS,
                });
                setText('');
            }
        } catch (err) {
            logger.error('Hoot dump failed', 'HootDumpCard', err);
            addToast('Dump failed — try again?', 'error');
        } finally {
            setLoading(false);
        }
    }, [text, loading, router, addToast, setPlanningContext]);

    const handleUndo = useCallback(() => {
        if (!receipt) return;
        restoreSnapshot(receipt.snapshot);
        addToast('Dump undone — state restored.', 'info');
        setReceipt(null);
    }, [receipt, addToast]);

    return (
        <div className="rpg-card p-5 space-y-3 border-2 border-[var(--color-purple)]/40 bg-gradient-to-br from-[var(--color-purple)]/8 to-[var(--color-blue)]/5">
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-purple)]" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-[var(--color-text-primary)]">
                    Tell Hoot about your day
                </h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
                Habits you did, things you bailed on, who you wanted to reach, books, identity — just
                word-dump. Hoot parses and writes it all. 10-sec undo.
            </p>

            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Did 20 pushups and meditated, wanted to email Garry Tan but bailed on TikTok around 2pm, felt anxious. Identity is 'I'm a founder who ships daily'."
                className="input-field min-h-[110px] resize-none text-sm"
                disabled={loading || transcribing}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        submit();
                    }
                }}
            />

            <div className="flex items-center gap-2">
                {supported && (
                    <button
                        type="button"
                        onMouseDown={() => startRecording()}
                        onMouseUp={() => stopRecording()}
                        onMouseLeave={() => isRecording && stopRecording()}
                        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                        disabled={loading || transcribing}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 ${isRecording
                            ? 'border-red-500 bg-red-500/20 text-red-300 animate-pulse'
                            : 'border-[var(--color-border)] bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:border-[var(--color-purple)]/60 hover:text-[var(--color-text-primary)]'
                            }`}
                        aria-label={isRecording ? 'Release to stop recording' : 'Hold to record'}
                        title={isRecording ? 'Release to stop' : 'Hold to record'}
                    >
                        <Mic size={14} />
                        {isRecording ? 'Recording…' : transcribing ? 'Transcribing…' : 'Hold to talk'}
                    </button>
                )}

                <button
                    type="button"
                    onClick={submit}
                    disabled={!text.trim() || loading || transcribing}
                    className="ml-auto rpg-button btn-primary text-sm font-bold px-4 py-2 flex items-center gap-2 disabled:opacity-40"
                >
                    {loading ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Processing…
                        </>
                    ) : (
                        <>
                            <Send size={14} /> Dump
                        </>
                    )}
                </button>
            </div>

            {/* Receipt + Undo */}
            <AnimatePresence>
                {receipt && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-2 p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-green)]/40 space-y-2"
                    >
                        <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-[var(--color-green)] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                                    {receipt.message}
                                </p>
                                {receipt.results.length > 0 && (
                                    <ul className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto">
                                        {receipt.results.map((r, i) => (
                                            <li key={i} className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleUndo}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-bg-hover)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] transition-colors"
                        >
                            <Undo2 size={12} />
                            Undo ({countdown}s)
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
