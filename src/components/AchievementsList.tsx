'use client';

import { useGameStore } from '@/store/useGameStore';
import { Award, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';

const ACHIEVEMENTS_DATA = [
    { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Complete your first quest' },
    { id: 'LEVEL_5', name: 'High Roller', description: 'Reach Level 5' },
    { id: 'QUEST_MASTER', name: 'Quest Master', description: 'Complete 10 quests' },
];

export default function AchievementsList() {
    const { achievements } = useGameStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="glass-panel p-6 mt-8 border-primary/20">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <Award className="text-secondary" />
                <span>ACHIEVEMENTS</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ACHIEVEMENTS_DATA.map((ach) => {
                    const unlocked = achievements.includes(ach.id);
                    return (
                        <div
                            key={ach.id}
                            className={`p-4 rounded-lg border flex flex-col items-center text-center transition-all
                ${unlocked
                                    ? 'bg-secondary/10 border-secondary/50 text-white shadow-[0_0_10px_rgba(189,0,255,0.2)]'
                                    : 'bg-black/20 border-white/5 text-gray-500 grayscale'}
              `}
                        >
                            <div className={`p-3 rounded-full mb-3 ${unlocked ? 'bg-secondary/20 text-secondary' : 'bg-white/5 text-gray-600'}`}>
                                {unlocked ? <Award size={24} /> : <Lock size={24} />}
                            </div>
                            <h3 className="font-bold text-sm mb-1">{ach.name}</h3>
                            <p className="text-xs opacity-70">{ach.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
