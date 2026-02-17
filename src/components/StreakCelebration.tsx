'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import confetti from 'canvas-confetti';
import { useToastStore } from './ToastContainer';

const STREAK_MILESTONES: Record<number, { emoji: string; message: string; gold: number }> = {
  3:   { emoji: '🔥', message: '3-Day Streak! You\'re on fire!', gold: 25 },
  7:   { emoji: '💎', message: 'ONE WEEK STREAK! Incredible consistency!', gold: 75 },
  14:  { emoji: '⚡', message: '2-WEEK WARRIOR! You\'re unstoppable!', gold: 150 },
  30:  { emoji: '👑', message: '30-DAY LEGEND! This is elite level!', gold: 500 },
  100: { emoji: '🌟', message: '100 DAYS! You are an absolute MACHINE!', gold: 2000 },
};

export default function StreakCelebration() {
  const { streak, addGold } = useGameStore();
  const { addToast } = useToastStore();
  const prevStreakRef = useRef(streak);

  useEffect(() => {
    const prev = prevStreakRef.current;
    prevStreakRef.current = streak;

    // Only trigger when streak increases
    if (streak <= prev) return;

    const milestone = STREAK_MILESTONES[streak];
    if (!milestone) return;

    // Fire confetti burst
    confetti({
      particleCount: streak >= 30 ? 300 : streak >= 7 ? 150 : 80,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#a78bfa', '#60a5fa', '#fbbf24', '#4ade80', '#f87171'],
    });

    // Second burst for big milestones
    if (streak >= 7) {
      setTimeout(() => {
        confetti({ particleCount: 100, angle: 60, spread: 80, origin: { x: 0, y: 0.6 } });
        confetti({ particleCount: 100, angle: 120, spread: 80, origin: { x: 1, y: 0.6 } });
      }, 300);
    }

    addGold(milestone.gold);
    addToast(`${milestone.emoji} ${milestone.message} +${milestone.gold} Gold bonus!`, 'success');
  }, [streak]);

  return null;
}
