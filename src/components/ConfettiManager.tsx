'use client';

import { useGameStore } from '@/store/useGameStore';
import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';

export default function ConfettiManager() {
    const { level, tasks } = useGameStore();
    const prevLevel = useRef(level);
    const prevCompletedTasks = useRef(tasks.filter(t => t.completed).length);

    // Level Up Confetti
    useEffect(() => {
        if (level > prevLevel.current && prevLevel.current !== 1) {
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#00ff94', '#bd00ff', '#ffffff']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#00ff94', '#bd00ff', '#ffffff']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
        prevLevel.current = level;
    }, [level]);

    // Epic Task Completion Confetti
    useEffect(() => {
        const currentCompleted = tasks.filter(t => t.completed).length;
        // Check if the most recently completed task was Epic? 
        // Simplified: Just trigger a small burst for any completion, big burst for Epic logic in store?
        // Since we don't know WHICH task was just completed easily without refactoring store to emit events,
        // let's do a small burst for ALL completions for now to add "Juice".

        if (currentCompleted > prevCompletedTasks.current) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00ff94', '#bd00ff'] // Brand colors
            });
        }
        prevCompletedTasks.current = currentCompleted;
    }, [tasks]);

    return null;
}
