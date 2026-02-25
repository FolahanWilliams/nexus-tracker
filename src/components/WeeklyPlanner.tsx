'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { Calendar, Sparkles, X, Lightbulb, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPulseDataForRoute } from '@/hooks/useNexusPulse';

interface DayPlan {
    day: string;
    focus: string;
    tasks: string[];
}

interface WeeklyPlan {
    briefing: string;
    days: DayPlan[];
    insight: string;
}

export default function WeeklyPlanner() {
    const { tasks, questChains, reflectionNotes, habits, streak, characterName, characterClass, level } = useGameStore();
    const { addToast } = useToastStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setPlan(null);
        try {
            const response = await fetch('/api/weekly-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks,
                    chains: questChains,
                    reflections: reflectionNotes,
                    habits: habits?.map((h: { name: string; streak: number }) => ({ name: h.name, streak: h.streak })) || [],
                    streaks: streak,
                    playerContext: { name: characterName, characterClass, level, streak },
                    pulseData: getPulseDataForRoute()
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setPlan(data);
            addToast('Weekly strategy generated! 📋', 'success');
        } catch (error) {
            console.error('Weekly plan error:', error);
            addToast('Failed to generate plan. Try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const DAY_COLORS = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-pink-400'];

    return (
        <>
            {/* Trigger Button */}
            <motion.button
                onClick={() => { setIsOpen(true); if (!plan) handleGenerate(); }}
                className="rpg-card p-4 w-full text-left hover:border-[var(--color-purple)] transition-colors group cursor-pointer"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--color-purple)]/20 rounded-lg flex items-center justify-center">
                            <Calendar size={20} className="text-[var(--color-purple)]" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Weekly Strategy</p>
                            <p className="text-xs text-[var(--color-text-muted)]">AI-powered weekly game plan</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-purple)] transition-colors" />
                </div>
            </motion.button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            className="rpg-card w-full max-w-xl max-h-[80vh] overflow-y-auto"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                                <div className="flex items-center gap-3">
                                    <Calendar size={20} className="text-[var(--color-purple)]" />
                                    <h2 className="text-lg font-bold">Weekly Strategy</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        onClick={handleGenerate}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 bg-[var(--color-purple)] text-white rounded text-xs font-bold disabled:opacity-50"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {isLoading ? '✨ Generating...' : '🔄 Regenerate'}
                                    </motion.button>
                                    <button onClick={() => setIsOpen(false)} className="p-1 hover:text-[var(--color-text-primary)]">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {isLoading ? (
                                    <div className="text-center py-12">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            className="text-3xl inline-block mb-3"
                                        >
                                            ✨
                                        </motion.div>
                                        <p className="text-[var(--color-text-muted)] text-sm">Hoot is analyzing your quests and energy patterns...</p>
                                    </div>
                                ) : plan ? (
                                    <>
                                        {/* Briefing */}
                                        <div className="bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/30 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles size={14} className="text-[var(--color-purple)]" />
                                                <span className="text-xs font-bold text-[var(--color-purple)] uppercase tracking-wide">Weekly Briefing</span>
                                            </div>
                                            <p className="text-sm leading-relaxed">{plan.briefing}</p>
                                        </div>

                                        {/* Day Plans */}
                                        {plan.days?.map((day, i) => (
                                            <motion.div
                                                key={day.day}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="border border-[var(--color-border)] rounded-lg p-4"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`font-bold text-sm ${DAY_COLORS[i % DAY_COLORS.length]}`}>{day.day}</span>
                                                </div>
                                                <p className="text-xs text-[var(--color-text-muted)] mb-2 italic">{day.focus}</p>
                                                {day.tasks?.length > 0 && (
                                                    <ul className="space-y-1">
                                                        {day.tasks.map((task, j) => (
                                                            <li key={j} className="text-sm flex items-start gap-2">
                                                                <span className="text-[var(--color-text-muted)] mt-0.5">•</span>
                                                                <span>{task}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </motion.div>
                                        ))}

                                        {/* Insight */}
                                        {plan.insight && (
                                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lightbulb size={14} className="text-yellow-400" />
                                                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Pattern Insight</span>
                                                </div>
                                                <p className="text-sm leading-relaxed">{plan.insight}</p>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
