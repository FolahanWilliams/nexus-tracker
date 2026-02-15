'use client';

import { useCallback } from 'react';

// Using free sound effects from reliable CDNs or placeholders
// Ideally these would be local files in /public/sounds
const SOUNDS = {
    complete: 'https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3', // Simple ding
    levelUp: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3', // Success fanfare
    buy: 'https://cdn.freesound.org/previews/201/201159_2325368-lq.mp3', // Cash register/coin
};

export function useSoundEffects() {
    const playSound = useCallback((type: keyof typeof SOUNDS) => {
        try {
            const audio = new Audio(SOUNDS[type]);
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed', e));
        } catch (error) {
            console.error('Audio error', error);
        }
    }, []);

    return { playSound };
}
