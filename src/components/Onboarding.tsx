'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Repeat2, Sparkles, ChevronRight, X } from 'lucide-react';

const ONBOARDING_KEY = 'questflow-onboarding-v2';

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Target;
  color: string;
  content: React.ReactNode;
}

function StepCreateQuest({ onComplete }: { onComplete: () => void }) {
  const [title, setTitle] = useState('');
  const { addTask } = useGameStore();
  const { addToast } = useToastStore();

  const SUGGESTIONS = [
    { title: 'Read for 30 minutes', difficulty: 'Easy' as const, category: 'Study' as const },
    { title: 'Exercise for 20 minutes', difficulty: 'Easy' as const, category: 'Health' as const },
    { title: 'Work on personal project for 1 hour', difficulty: 'Medium' as const, category: 'Creative' as const },
  ];

  const handleCreate = (questTitle: string, difficulty: 'Easy' | 'Medium' = 'Easy', category: 'Study' | 'Health' | 'Creative' = 'Study') => {
    addTask(questTitle, difficulty, undefined, category);
    addToast(`Quest created: "${questTitle}" — +${difficulty === 'Easy' ? 10 : 25} XP on completion!`, 'success');
    onComplete();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Quests are your tasks. Complete them to earn XP, level up, and unlock rewards.
      </p>
      <div>
        <label htmlFor="onboard-quest" className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 block">
          Write your own
        </label>
        <div className="flex gap-2">
          <input
            id="onboard-quest"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to accomplish?"
            className="input-field flex-1 text-sm"
            maxLength={200}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) handleCreate(title.trim()); }}
          />
          <button
            onClick={() => title.trim() && handleCreate(title.trim())}
            disabled={!title.trim()}
            className="rpg-button btn-primary text-sm px-4"
          >
            <Target size={16} /> Create
          </button>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Or pick a starter</p>
        <div className="space-y-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              onClick={() => handleCreate(s.title, s.difficulty, s.category)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] hover:border-[var(--color-green)]/50 transition-all text-left group"
            >
              <span className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">{s.title}</span>
              <span className="text-xs font-bold text-[var(--color-green)]">+{s.difficulty === 'Easy' ? 10 : 25} XP</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepAddHabit({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState('');
  const { addHabit } = useGameStore();
  const { addToast } = useToastStore();

  const SUGGESTIONS = [
    { name: 'Exercise', icon: '💪', category: 'Health' as const, xp: 15 },
    { name: 'Read', icon: '📖', category: 'Study' as const, xp: 10 },
    { name: 'Meditate', icon: '🧘', category: 'Health' as const, xp: 10 },
    { name: 'Journal', icon: '✍️', category: 'Personal' as const, xp: 10 },
  ];

  const handleAdd = (habitName: string, icon: string = '✅', category: 'Health' | 'Study' | 'Personal' = 'Personal', xp: number = 10) => {
    addHabit(habitName, icon, category, xp);
    addToast(`Habit "${habitName}" added! Complete it daily to build streaks.`, 'success');
    onComplete();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Habits are daily actions that build streaks. The longer your streak, the more XP you earn. Smart scheduling adapts to your consistency.
      </p>
      <div>
        <label htmlFor="onboard-habit" className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 block">
          Create your own
        </label>
        <div className="flex gap-2">
          <input
            id="onboard-habit"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Drink 8 glasses of water"
            className="input-field flex-1 text-sm"
            maxLength={100}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleAdd(name.trim()); }}
          />
          <button
            onClick={() => name.trim() && handleAdd(name.trim())}
            disabled={!name.trim()}
            className="rpg-button btn-primary text-sm px-4"
          >
            <Repeat2 size={16} /> Add
          </button>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Popular starters</p>
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.name}
              onClick={() => handleAdd(s.name, s.icon, s.category, s.xp)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] hover:border-[var(--color-purple)]/50 transition-all text-left group"
            >
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">{s.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">+{s.xp} XP/day</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepMeetHoot({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Hoot is your AI-powered coach. It can create quests, break down goals, track your patterns, and give personalized advice.
      </p>
      <div className="bg-[var(--color-bg-dark)] rounded-xl p-4 border border-[var(--color-border)] space-y-3">
        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Try saying:</p>
        {[
          '"Break down my goal of learning Spanish"',
          '"What should I focus on today?"',
          '"Generate quests for getting fit"',
        ].map((example) => (
          <div key={example} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <ChevronRight size={12} className="text-[var(--color-purple)] flex-shrink-0" />
            <span>{example}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Look for the 🦉 button in the bottom-right corner. Tap it anytime to chat with Hoot.
      </p>
      <button
        onClick={onComplete}
        className="rpg-button btn-primary w-full"
      >
        <Sparkles size={16} /> Got it — let&apos;s go!
      </button>
    </div>
  );
}

export default function Onboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      setTimeout(() => setShowOnboarding(true), 300);
    }
  }, []);

  const markStepDone = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => new Set(prev).add(stepIndex));
    // Auto-advance after a brief delay
    setTimeout(() => {
      if (stepIndex < 2) {
        setCurrentStep(stepIndex + 1);
      } else {
        setShowOnboarding(false);
        localStorage.setItem(ONBOARDING_KEY, 'true');
      }
    }, 400);
  }, []);

  const handleSkip = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const steps: OnboardingStep[] = [
    {
      id: 'quest',
      title: 'Create Your First Quest',
      subtitle: 'Step 1 of 3',
      icon: Target,
      color: 'var(--color-green)',
      content: <StepCreateQuest onComplete={() => markStepDone(0)} />,
    },
    {
      id: 'habit',
      title: 'Add a Daily Habit',
      subtitle: 'Step 2 of 3',
      icon: Repeat2,
      color: 'var(--color-purple)',
      content: <StepAddHabit onComplete={() => markStepDone(1)} />,
    },
    {
      id: 'hoot',
      title: 'Meet Hoot, Your AI Coach',
      subtitle: 'Step 3 of 3',
      icon: Sparkles,
      color: 'var(--color-blue)',
      content: <StepMeetHoot onComplete={() => markStepDone(2)} />,
    },
  ];

  if (!showOnboarding) return null;

  const step = steps[currentStep];
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
          key={step.id}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="rpg-card max-w-md w-full relative"
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white transition-colors"
            aria-label="Skip onboarding"
          >
            <X size={20} />
          </button>

          {/* Step header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${step.color} 15%, transparent)` }}
            >
              <Icon size={24} style={{ color: step.color }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{step.subtitle}</p>
              <h2 className="text-lg font-bold">{step.title}</h2>
            </div>
          </div>

          {/* Step content */}
          {step.content}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-[var(--color-purple)]'
                    : completedSteps.has(index)
                      ? 'w-2 bg-[var(--color-green)]'
                      : 'w-2 bg-[var(--color-border)]'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="block mx-auto mt-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Skip for now
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Re-open onboarding (called from settings page). */
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
