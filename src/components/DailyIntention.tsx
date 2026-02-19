'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Star, Zap } from 'lucide-react';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Legendary'];
const ENERGY_COLORS = [
  'var(--color-red)',
  'var(--color-orange)',
  'var(--color-yellow)',
  'var(--color-green)',
  'var(--color-purple)',
];

export default function DailyIntention() {
  const {
    lastIntentionDate,
    lastReflectionDate,
    todayIntention,
    setDailyIntention,
    addReflectionNote,
    tasks,
    habits,
    streak,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [showMorning, setShowMorning] = useState(false);
  const [showEvening, setShowEvening] = useState(false);

  // Form state
  const [intention, setIntention] = useState('');
  const [energyRating, setEnergyRating] = useState(3);
  const [reflectionNote, setReflectionNote] = useState('');
  const [stars, setStars] = useState(3);

  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  useEffect(() => {
    // Show morning modal if:  it's before noon, intention not set today
    if (hour >= 6 && hour < 13 && lastIntentionDate !== today) {
      const timer = setTimeout(() => setShowMorning(true), 2000);
      return () => clearTimeout(timer);
    }
    // Show evening modal if: it's after 7pm, reflection not done today
    if (hour >= 19 && lastReflectionDate !== today) {
      const timer = setTimeout(() => setShowEvening(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleMorningSubmit = () => {
    if (!intention.trim()) return;
    setDailyIntention(intention, energyRating);
    triggerXPFloat('+10 XP', '#4ade80');
    addToast(`Intention set! +10 XP. Go make it happen! 🎯`, 'success');
    setShowMorning(false);
  };

  const handleEveningSubmit = () => {
    const today2 = new Date().toISOString().split('T')[0];
    const completedToday = tasks.filter(t => t.completed && t.completedAt?.startsWith(today2)).length;
    const habitsToday = habits.filter(h => h.completedDates.includes(today2)).length;
    const xpBonus = stars * 10 + (completedToday * 5);
    addReflectionNote(reflectionNote, stars, xpBonus);
    if (xpBonus > 0) triggerXPFloat(`+${xpBonus} XP`, '#4ade80');
    addToast(`Reflection complete! +${xpBonus} XP bonus. See you tomorrow! 🌙`, 'success');
    setShowEvening(false);
  };

  return (
    <>
      {/* Morning Modal */}
      <AnimatePresence>
        {showMorning && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMorning(false)}
          >
            <motion.div
              className="rpg-card max-w-md w-full relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowMorning(false)}
                className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <motion.div
                  className="text-4xl mb-2"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sun className="inline text-[var(--color-yellow)]" size={40} />
                </motion.div>
                <h2 className="text-xl font-bold">Morning Check-In</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">What&apos;s your #1 focus today?</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold block mb-2">Today&apos;s Intention</label>
                  <input
                    type="text"
                    value={intention}
                    onChange={e => setIntention(e.target.value)}
                    placeholder="e.g., Finish Chapter 5 of my textbook"
                    className="input-field"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleMorningSubmit()}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-3">Energy Level</label>
                  <div className="flex gap-2">
                    {ENERGY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => setEnergyRating(i + 1)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${energyRating === i + 1
                          ? 'border-transparent text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                          }`}
                        style={energyRating === i + 1 ? { backgroundColor: ENERGY_COLORS[i] } : {}}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  onClick={handleMorningSubmit}
                  disabled={!intention.trim()}
                  className="w-full rpg-button !bg-[var(--color-yellow)] !text-black font-bold disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap size={18} /> Set Intention & Earn +10 XP
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evening Reflection Modal */}
      <AnimatePresence>
        {showEvening && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEvening(false)}
          >
            <motion.div
              className="rpg-card max-w-md w-full relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowEvening(false)}
                className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <Moon className="inline text-[var(--color-blue)] mb-2" size={36} />
                <h2 className="text-xl font-bold">Evening Reflection</h2>
                {todayIntention && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Today&apos;s intention: <span className="text-[var(--color-purple)] italic">&quot;{todayIntention}&quot;</span>
                  </p>
                )}
              </div>

              <div className="space-y-5">
                {/* Star rating */}
                <div>
                  <label className="text-sm font-semibold block mb-3">How did today go?</label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <motion.button
                        key={s}
                        onClick={() => setStars(s)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`${s} stars`}
                      >
                        <Star
                          size={32}
                          className={s <= stars ? 'text-[var(--color-yellow)]' : 'text-[var(--color-border)]'}
                          fill={s <= stars ? 'var(--color-yellow)' : 'none'}
                        />
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-center text-sm text-[var(--color-text-muted)] mt-1">
                    {['', 'Rough day', 'Could be better', 'Decent day', 'Great day!', 'LEGENDARY DAY!'][stars]}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Quick reflection (optional)</label>
                  <textarea
                    value={reflectionNote}
                    onChange={e => setReflectionNote(e.target.value)}
                    placeholder="What did you accomplish? What will you do better tomorrow?"
                    className="input-field min-h-[80px] resize-none text-sm"
                  />
                </div>

                <motion.button
                  onClick={handleEveningSubmit}
                  className="w-full rpg-button !bg-[var(--color-blue)] !text-white font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Moon size={16} /> Submit Reflection & Earn +{stars * 10}+ XP
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
