'use client';

import { useGameStore } from '@/store/useGameStore';
import { Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LevelUpModal() {
    const { level, showLevelUp, closeLevelUp } = useGameStore();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (showLevelUp) {
            setVisible(true);
            // Optional sound effect here
        } else {
            setVisible(false);
        }
    }, [showLevelUp]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-black border-2 border-primary rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(0,255,148,0.3)] animate-in zoom-in-50 duration-500">

                {/* Close button */}
                <button
                    onClick={closeLevelUp}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Content */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-full bg-primary/20 border border-primary animate-bounce">
                        <Trophy size={48} className="text-primary" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-widest">
                    Level Up!
                </h2>

                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-green-600 mb-6 drop-shadow-[0_0_10px_rgba(0,255,148,0.5)]">
                    {level}
                </div>

                <p className="text-gray-400 mb-8">
                    You are becoming more productive. Keep up the momentum!
                </p>

                <button
                    onClick={closeLevelUp}
                    className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                >
                    CONTINUE
                </button>
            </div>
        </div>
    );
}
