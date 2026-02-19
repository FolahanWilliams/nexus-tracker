'use client';

import { useGameStore } from '@/store/useGameStore';
import { useCallback, useEffect, useRef } from 'react';

// Using free sound effects - simplified
const SOUNDS = {
    complete: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Ding
    levelUp: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Victory
    buy: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Cash register
};

const VIBRATIONS = {
    complete: 50, // Short tick
    buy: [30, 50, 30], // Double tap
    levelUp: [100, 50, 100, 50, 200], // Victory fanfare pattern
};

export default function SoundManager() {
    const { gold, level, tasks } = useGameStore();

    // Refs to track previous state
    const prevGold = useRef(gold);
    const prevLevel = useRef(level);
    const prevTaskCount = useRef(tasks.filter(t => t.completed).length);

    const playSoundAndVibrate = useCallback((src: string, pattern?: number | number[]) => {
        try {
            const audio = new Audio(src);
            audio.volume = 0.5;
            audio.play().catch(() => { });

            if (pattern && typeof window !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch { }
    }, []);

    // Effect for Buying (Gold decrease)
    useEffect(() => {
        if (gold < prevGold.current) {
            playSoundAndVibrate(SOUNDS.buy, VIBRATIONS.buy);
        }
        prevGold.current = gold;
    }, [gold, playSoundAndVibrate]);

    // Effect for Level Up
    useEffect(() => {
        if (level > prevLevel.current && prevLevel.current !== 1) {
            playSoundAndVibrate(SOUNDS.levelUp, VIBRATIONS.levelUp);
        }
        prevLevel.current = level;
    }, [level, playSoundAndVibrate]);

    // Effect for Task Completion
    useEffect(() => {
        const currentCompleted = tasks.filter(t => t.completed).length;
        if (currentCompleted > prevTaskCount.current) {
            playSoundAndVibrate(SOUNDS.complete, VIBRATIONS.complete);
        }
        prevTaskCount.current = currentCompleted;
    }, [tasks, playSoundAndVibrate]);

    return null;
}
