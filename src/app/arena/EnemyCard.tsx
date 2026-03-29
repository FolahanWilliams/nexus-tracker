'use client';

import { motion } from 'framer-motion';
import { Skull, Shield, Zap } from 'lucide-react';
import type { ArenaEnemy } from '@/store/types';

const DIFFICULTY_COLORS = {
    easy: 'text-green-400',
    medium: 'text-blue-400',
    hard: 'text-purple-400',
    legendary: 'text-amber-400',
};

const ENEMY_EMOJIS: Record<string, string> = {
    dragon: '🐉', goblin: '👹', lich: '💀', demon: '😈',
    troll: '🧌', spider: '🕷️', wolf: '🐺', serpent: '🐍',
    golem: '🗿', wraith: '👻', default: '⚔️',
};

interface EnemyCardProps {
    enemy: ArenaEnemy;
}

export default function EnemyCard({ enemy }: EnemyCardProps) {
    const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    const emoji = ENEMY_EMOJIS[enemy.imageHint] ?? ENEMY_EMOJIS.default;

    return (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{emoji}</span>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{enemy.name}</h3>
                    <p className={`text-xs font-semibold uppercase ${DIFFICULTY_COLORS[enemy.difficulty]}`}>
                        {enemy.difficulty}
                    </p>
                </div>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-3">{enemy.description}</p>

            {/* HP Bar */}
            <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400 font-semibold">HP</span>
                    <span>{enemy.hp} / {enemy.maxHp}</span>
                </div>
                <div className="w-full h-3 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: hpPercent > 50 ? 'var(--color-green)' : hpPercent > 25 ? 'var(--color-yellow)' : '#ef4444',
                        }}
                        animate={{ width: `${hpPercent}%` }}
                        transition={{ type: 'spring', damping: 15 }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs text-[var(--color-text-secondary)] mt-2">
                <span className="flex items-center gap-1"><Skull size={12} /> ATK: {enemy.attackDamage}</span>
                {enemy.specialAbility && (
                    <span className="flex items-center gap-1 text-purple-400">
                        <Zap size={12} /> {enemy.specialAbility.replace('_', ' ')}
                    </span>
                )}
            </div>
        </div>
    );
}
