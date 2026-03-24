import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { memo } from 'react';

interface Nudge {
    id: string;
    text: string;
    actionLabel: string;
    priority: 'low' | 'medium' | 'high';
    type: 'quest' | 'habit' | 'hp' | 'celebration';
}

interface HootNudgeBubbleProps {
    nudge: Nudge;
    onAccept: () => void;
    onDismiss: () => void;
}

export default memo(function HootNudgeBubble({ nudge, onAccept, onDismiss }: HootNudgeBubbleProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="fixed bottom-40 right-6 z-[var(--z-fab)] w-72 pointer-events-auto"
            role="alert"
            aria-label="Hoot nudge"
        >
            <div className="relative bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-4 shadow-2xl glow-purple overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)]" />

                <button
                    onClick={onDismiss}
                    className="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Dismiss nudge"
                >
                    <X size={14} />
                </button>

                <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-purple)]/20 flex items-center justify-center text-xl shrink-0">🦉</div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-purple)] font-bold mb-0.5">Hoot Advice</p>
                        <p className="text-sm text-[var(--color-text-primary)] leading-snug font-medium">{nudge.text}</p>
                    </div>
                </div>

                <button
                    onClick={onAccept}
                    className="w-full py-2 bg-[var(--color-purple)] hover:bg-[var(--color-purple)]/90 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 group"
                >
                    <span>{nudge.actionLabel}</span>
                    <Sparkles size={12} className="group-hover:animate-pulse" />
                </button>

                <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[var(--color-bg-secondary)] border-r border-b border-[var(--color-border)] rotate-45" />
            </div>
        </motion.div>
    );
});
