'use client';

import { useGameStore } from '@/store/useGameStore';
import { Coins, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GameHUD() {
    const { xp, level, gold, streak } = useGameStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // Prevent hydration mismatch

    // Calculate progress to next level
    const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
    const nextLevelBaseXP = Math.pow(level, 2) * 100;
    const xpNeededForLevel = nextLevelBaseXP - currentLevelBaseXP;
    const currentXPInLevel = xp - currentLevelBaseXP;
    const progressPercent = Math.min(100, Math.max(0, (currentXPInLevel / xpNeededForLevel) * 100));

    return (
        <div className="glass-panel p-6 mb-8 relative overflow-hidden neon-border">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="flex justify-between items-end mb-4">
                <div className="flex gap-6 items-end">
                    <div>
                        <h2 className="text-sm text-gray-400 uppercase tracking-wider">Level</h2>
                        <div className="text-4xl font-bold neon-text leading-none">{level}</div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center gap-1 text-yellow-400">
                            <Coins size={16} />
                            <span className="font-bold text-xl">{gold}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gold</div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center gap-1 text-orange-500">
                            <Flame size={16} className={streak > 0 ? "fill-orange-500 animate-pulse" : ""} />
                            <span className="font-bold text-xl">{streak}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Day Streak</div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-400">
                        {Math.floor(currentXPInLevel)} / {xpNeededForLevel} XP
                    </div>
                    <div className="text-xs text-primary">To Level {level + 1}</div>
                </div>
            </div>

            {/* Progress Bar Container */}
            <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
                {/* Progress Fill */}
                <div
                    className="h-full bg-primary transition-all duration-1000 ease-out relative"
                    style={{ width: `${progressPercent}%` }}
                >
                    <div className="absolute inset-0 bg-white opacity-20 animate-pulse-glow" />
                </div>
            </div>
        </div>
    );
}
