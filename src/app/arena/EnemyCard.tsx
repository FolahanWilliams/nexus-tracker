'use client';

import { motion } from 'framer-motion';
import { Skull, Shield, Zap, Timer, Magnet, CircleSlash } from 'lucide-react';
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

const ABILITY_CONFIG: Record<string, { label: string; icon: typeof Zap; color: string; detail: string }> = {
    double_attack: { label: '2x ATK', icon: Zap, color: 'text-red-400 bg-red-900/20 border-red-500/30', detail: '1.5x damage' },
    removes_vowel: { label: 'Devours Vowels', icon: CircleSlash, color: 'text-orange-400 bg-orange-900/20 border-orange-500/30', detail: 'Removes a vowel' },
    steals_letter: { label: 'Steals Letters', icon: Magnet, color: 'text-purple-400 bg-purple-900/20 border-purple-500/30', detail: 'Takes best letter' },
    time_pressure: { label: 'Time Pressure', icon: Timer, color: 'text-cyan-400 bg-cyan-900/20 border-cyan-500/30', detail: '15s limit' },
};

function AbilityBadge({ ability }: { ability: string }) {
    const config = ABILITY_CONFIG[ability];
    if (!config) return null;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${config.color}`}>
            <Icon size={12} />
            {config.label}
            <span className="opacity-60 ml-0.5">({config.detail})</span>
        </span>
    );
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
            </div>

            {/* Special ability badge */}
            {enemy.specialAbility && (
                <div className="mt-2">
                    <AbilityBadge ability={enemy.specialAbility} />
                </div>
            )}
        </div>
    );
}
