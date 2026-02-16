'use client';

import { useGameStore } from '@/store/useGameStore';
import { Trophy, X, Sparkles, Zap, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

export default function LevelUpModal() {
  const { level, showLevelUp, closeLevelUp } = useGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showLevelUp) {
      setVisible(true);
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#8b5cf6', '#d946ef', '#10b981', '#fbbf24']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#8b5cf6', '#d946ef', '#10b981', '#fbbf24']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      setVisible(false);
    }
  }, [showLevelUp]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md animate-scale-in">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 animate-pulse" />
        
        {/* Modal Content */}
        <div className="relative bg-[#0f0f23] rounded-3xl p-8 border border-white/20 shadow-2xl">
          {/* Close Button */}
          <button
            onClick={closeLevelUp}
            className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={24} />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl animate-bounce-subtle">
              <Trophy className="text-white" size={48} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center mb-2">
            <span className="text-gradient">Level Up!</span>
          </h2>

          {/* Level Display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
              <Star className="text-yellow-400" size={24} />
              <span className="text-5xl font-bold">{level}</span>
              <Star className="text-yellow-400" size={24} />
            </div>
          </div>

          {/* Rewards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-center p-4 rounded-xl bg-white/5">
              <Zap className="mx-auto mb-2 text-yellow-400" size={24} />
              <p className="text-sm text-white/60">XP Boost</p>
              <p className="font-bold">Unlocked!</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <Sparkles className="mx-auto mb-2 text-purple-400" size={24} />
              <p className="text-sm text-white/60">New Title</p>
              <p className="font-bold">Earned!</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-center text-white/70 mb-8">
            Amazing progress! Keep completing quests to reach even higher levels.
          </p>

          {/* Button */}
          <button
            onClick={closeLevelUp}
            className="w-full btn btn-primary py-4 text-lg"
          >
            Continue Adventure
            <Sparkles size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
