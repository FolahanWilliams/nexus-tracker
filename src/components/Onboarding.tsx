'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, Sword, Trophy, Sparkles as Skills, X } from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to QuestFlow!',
    description: 'Your AI-powered productivity RPG. Level up by completing real-world tasks!',
    icon: Sparkles,
    color: 'var(--color-purple)'
  },
  {
    title: 'Complete Quests',
    description: 'Add tasks and mark them complete to earn XP and Gold. Use AI to generate personalized quests!',
    icon: Target,
    color: 'var(--color-green)'
  },
  {
    title: 'Battle Bosses',
    description: 'Take on powerful bosses for big rewards. Defeat them before time runs out!',
    icon: Sword,
    color: 'var(--color-red)'
  },
  {
    title: 'Build Your Arsenal',
    description: 'Collect items, craft powerful gear, and equip them to boost your rewards!',
    icon: Trophy,
    color: 'var(--color-yellow)'
  },
  {
    title: 'Master Skills',
    description: 'Upgrade your skill tree to earn bonus XP, gold, and other powerful effects!',
    icon: Skills,
    color: 'var(--color-blue)'
  }
];

export default function Onboarding() {
  const { tasks, level, achievements } = useGameStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    // Show onboarding for new users (less than 3 tasks and no achievements)
    if (tasks.length < 3 && achievements.length === 0) {
      const seenOnboarding = localStorage.getItem('questflow-onboarding');
      if (!seenOnboarding) {
        // Use timeout to defer state update
        setTimeout(() => {
          setShowOnboarding(true);
        }, 100);
      }
    }
  }, [tasks.length, achievements.length]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowOnboarding(false);
      localStorage.setItem('questflow-onboarding', 'true');
    }
  };

  const handleSkip = () => {
    setShowOnboarding(false);
    localStorage.setItem('questflow-onboarding', 'true');
  };

  if (!showOnboarding) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rpg-card max-w-md w-full text-center relative"
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white"
          >
            <X size={24} />
          </button>

          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: step.color + '/20' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Icon size={40} style={{ color: step.color }} />
          </motion.div>

          <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
          <p className="text-[var(--color-text-secondary)] mb-8">{step.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index <= currentStep 
                    ? 'bg-[var(--color-purple)] w-6' 
                    : 'bg-[var(--color-bg-dark)]'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 rpg-button"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white"
            >
              {currentStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Get Started!'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
