'use client';

import { useGameStore } from '@/store/useGameStore';
import { useCallback, useEffect, useRef } from 'react';

// Using free sound effects - simplified
const SOUNDS = {
    complete: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Ding
    levelUp: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Victory
    buy: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Cash register
};

export default function SoundManager() {
    const { gold, level, tasks } = useGameStore();

    // Refs to track previous state
    const prevGold = useRef(gold);
    const prevLevel = useRef(level);
    const prevTaskCount = useRef(tasks.filter(t => t.completed).length); // Track completed count

    const playSound = useCallback((src: string) => {
        try {
            const audio = new Audio(src);
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch { }
    }, []);

    // Effect for Buying (Gold decrease)
    useEffect(() => {
        if (gold < prevGold.current) {
            playSound(SOUNDS.buy);
        }
        prevGold.current = gold;
    }, [gold, playSound]);

    // Effect for Level Up
    useEffect(() => {
        if (level > prevLevel.current && prevLevel.current !== 1) { // Avoid initial load play
            playSound(SOUNDS.levelUp);
        }
        prevLevel.current = level;
    }, [level, playSound]);

    // Effect for Task Completion
    useEffect(() => {
        const currentCompleted = tasks.filter(t => t.completed).length;
        if (currentCompleted > prevTaskCount.current) {
            playSound(SOUNDS.complete);
        }
        prevTaskCount.current = currentCompleted;
    }, [tasks, playSound]);

    return null;
}
