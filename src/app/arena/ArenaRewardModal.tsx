'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Coins, Sparkles, X } from 'lucide-react';

interface ArenaRewardModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    victory: boolean;
    xpEarned: number;
    goldEarned: number;
    bonusInfo?: string;
    itemDropped?: string;
}

export default function ArenaRewardModal({
    open, onClose, title, victory, xpEarned, goldEarned, bonusInfo, itemDropped,
}: ArenaRewardModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 max-w-sm w-full"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                {victory ? <Trophy className="text-amber-400" size={24} /> : <Sparkles className="text-gray-400" size={24} />}
                                <h2 className="text-lg font-bold">{title}</h2>
                            </div>
                            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                                <X size={20} />
                            </button>
                        </div>

                        <p className={`text-center text-2xl font-bold mb-4 ${victory ? 'text-amber-400' : 'text-red-400'}`}>
                            {victory ? 'Victory!' : 'Defeated'}
                        </p>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-[var(--color-bg-dark)] rounded-lg p-3">
                                <span className="flex items-center gap-2 text-sm"><Star size={16} className="text-[var(--color-purple)]" /> XP Earned</span>
                                <span className="font-bold text-[var(--color-purple)]">+{xpEarned}</span>
                            </div>
                            <div className="flex items-center justify-between bg-[var(--color-bg-dark)] rounded-lg p-3">
                                <span className="flex items-center gap-2 text-sm"><Coins size={16} className="text-amber-400" /> Gold Earned</span>
                                <span className="font-bold text-amber-400">+{goldEarned}</span>
                            </div>
                            {bonusInfo && (
                                <div className="text-center text-sm text-[var(--color-text-secondary)] italic">
                                    {bonusInfo}
                                </div>
                            )}
                            {itemDropped && (
                                <div className="flex items-center justify-center gap-2 text-sm text-green-400 font-semibold">
                                    <Sparkles size={14} /> Item Drop: {itemDropped}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-5 py-2.5 bg-[var(--color-purple)] hover:bg-[var(--color-purple-hover)] text-white font-semibold rounded-lg transition-colors"
                        >
                            Continue
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
