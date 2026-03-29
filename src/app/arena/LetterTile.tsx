'use client';

import { motion } from 'framer-motion';
import { LETTER_SCORES, getLetterRarity } from '@/lib/arenaConstants';

const RARITY_STYLES = {
    common: 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-primary)]',
    uncommon: 'bg-green-900/30 border-green-500/50 text-green-300',
    rare: 'bg-blue-900/30 border-blue-500/50 text-blue-300',
    epic: 'bg-purple-900/30 border-purple-500/50 text-purple-300',
    legendary: 'bg-amber-900/30 border-amber-500/50 text-amber-300',
};

interface LetterTileProps {
    letter: string;
    selected?: boolean;
    disabled?: boolean;
    shortcutKey?: string;
    onClick?: () => void;
}

export default function LetterTile({ letter, selected, disabled, shortcutKey, onClick }: LetterTileProps) {
    const rarity = getLetterRarity(letter);
    const score = LETTER_SCORES[letter.toUpperCase()] ?? 1;

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.1 } : undefined}
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            className={`relative w-12 h-12 rounded-lg border-2 font-bold text-lg flex items-center justify-center transition-all cursor-pointer
                ${RARITY_STYLES[rarity]}
                ${selected ? 'ring-2 ring-[var(--color-purple)] opacity-50' : ''}
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-125'}
            `}
        >
            {shortcutKey && (
                <span className="absolute top-0.5 left-1 text-[9px] opacity-40 font-mono">{shortcutKey}</span>
            )}
            {letter.toUpperCase()}
            <span className="absolute bottom-0.5 right-1 text-[10px] opacity-60">{score}</span>
        </motion.button>
    );
}
