'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, BarChart3, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { logger } from '@/lib/logger';

interface CoachSource {
    title: string;
    url: string;
}

interface CoachResponse {
    message: string;
    trendInsight: string | null;
    sources: CoachSource[] | null;
    isMock?: boolean;
}

export default function AICoachWidget() {
    const {
        characterName, characterClass, level, streak,
        reflectionNotes, todayEnergyRating, tasks, habits
    } = useGameStore();

    const [messages, setMessages] = useState<CoachResponse[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [hasAutoFetched, setHasAutoFetched] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const today = new Date().toISOString().split('T')[0];

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-fetch coaching message based on today's reflection (once)
    useEffect(() => {
        if (hasAutoFetched) return;
        if (reflectionNotes.length === 0) return;

        const lastReflection = reflectionNotes[reflectionNotes.length - 1];
        if (lastReflection.date !== today) return;

        setHasAutoFetched(true);
        fetchCoachResponse(lastReflection.note);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reflectionNotes.length]);

    async function fetchCoachResponse(input: string) {
        setIsLoading(true);
        try {
            const completedToday = tasks.filter(t => t.completed && t.completedAt?.startsWith(today));
            const habitsToday = habits.filter(h => h.completedDates.includes(today));

            const response = await fetch('/api/ai-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reflection: input,
                    energyRating: todayEnergyRating,
                    recentTasks: completedToday,
                    playerContext: { name: characterName, characterClass, level, streak },
                    reflectionHistory: reflectionNotes,
                    habitsCompleted: habitsToday.length,
                    totalHabits: habits.length,
                })
            });
            const data: CoachResponse = await response.json();
            setMessages(prev => [...prev, data]);
        } catch (error) {
            logger.error('AI Coach error', 'AICoach', error);
            setMessages(prev => [...prev, {
                message: "I couldn't connect right now, but I'm still rooting for you! 🦉",
                trendInsight: null,
                sources: null,
                isMock: true,
            }]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = userInput.trim();
        if (!trimmed || isLoading) return;
        setUserInput('');
        setIsExpanded(true);
        fetchCoachResponse(trimmed);
    }

    return (
        <div className="rpg-card !p-0 overflow-hidden !border-[var(--color-blue)]/30"
            style={{ background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.06), rgba(167, 139, 250, 0.06))' }}
        >
            {/* Header — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-blue)]/15 flex items-center justify-center text-xl">
                        🦉
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">Hoot — AI Coach</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                            {messages.length > 0
                                ? 'Powered by Google Search'
                                : 'Ask anything or write a reflection'
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <span className="text-[10px] font-semibold text-[var(--color-blue)] bg-[var(--color-blue)]/10 rounded-full px-2 py-0.5">
                            {messages.length} {messages.length === 1 ? 'msg' : 'msgs'}
                        </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Messages area */}
                        <div className="px-4 pb-2 max-h-[280px] overflow-y-auto space-y-3 scrollbar-thin">
                            {messages.length === 0 && !isLoading && (
                                <div className="text-center py-6">
                                    <div className="text-3xl mb-2">🦉</div>
                                    <p className="text-sm text-[var(--color-text-muted)] mb-1">
                                        Hey{characterName ? `, ${characterName}` : ''}! I&apos;m Hoot, your AI coach.
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Ask me anything — I can research the web for real tips, resources, and advice.
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative"
                                >
                                    {/* Coach message */}
                                    <div className="flex gap-2.5 items-start">
                                        <div className="text-lg mt-0.5 shrink-0">🦉</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                                {msg.message}
                                            </p>

                                            {/* Trend Insight */}
                                            {msg.trendInsight && (
                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-yellow)] bg-[var(--color-yellow)]/8 rounded-md px-2.5 py-1.5 w-fit">
                                                    <BarChart3 size={11} className="shrink-0" />
                                                    <span className="italic">{msg.trendInsight}</span>
                                                </div>
                                            )}

                                            {/* Sources */}
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Sources</p>
                                                    {msg.sources.map((src, j) => (
                                                        <a
                                                            key={j}
                                                            href={src.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs text-[var(--color-blue)] hover:text-[var(--color-purple)] transition-colors group"
                                                        >
                                                            <ExternalLink size={10} className="shrink-0 opacity-60 group-hover:opacity-100" />
                                                            <span className="truncate underline decoration-[var(--color-blue)]/30 group-hover:decoration-[var(--color-purple)]/60">
                                                                {src.title}
                                                            </span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2.5 py-2"
                                >
                                    <div className="text-lg">🦉</div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Hoot is researching...</span>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area */}
                        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={userInput}
                                    onChange={e => setUserInput(e.target.value)}
                                    placeholder="Ask Hoot anything..."
                                    className="flex-1 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-blue)]/50 transition-colors"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!userInput.trim() || isLoading}
                                    className="rpg-button !p-2 !bg-[var(--color-blue)] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                                    title="Send message"
                                >
                                    {isLoading
                                        ? <Loader2 size={16} className="animate-spin text-white" />
                                        : <Send size={16} className="text-white" />
                                    }
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 px-1">
                                <Sparkles size={9} className="text-[var(--color-blue)]/60" />
                                <p className="text-[9px] text-[var(--color-text-muted)]">
                                    Grounded with Google Search — real-time facts &amp; resources
                                </p>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
