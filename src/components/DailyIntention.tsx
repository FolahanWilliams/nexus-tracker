'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, BookOpen, Zap } from 'lucide-react';
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

const PRODUCTIVITY_LABELS = ['', 'Barely', 'Very Low', 'Low', 'Below Avg', 'Average', 'Above Avg', 'Good', 'Great', 'Excellent', 'Peak'];

export default function DailyIntention() {
  const {
    lastIntentionDate,
    todayIntention,
    setDailyIntention,
    addOrUpdateCalendarEntry,
    dailyCalendarEntries,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [showMorning, setShowMorning] = useState(false);
  const [showEvening, setShowEvening] = useState(false);

  // Form state
  const [intention, setIntention] = useState('');
  const [energyRating, setEnergyRating] = useState(3);
  const [slightEdgeSummary, setSlightEdgeSummary] = useState('');
  const [slightEdgeLearned, setSlightEdgeLearned] = useState('');
  const [productivityScore, setProductivityScore] = useState(5);

  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  useEffect(() => {
    // Show morning modal if:  it's before noon, intention not set today
    if (hour >= 6 && hour < 13 && lastIntentionDate !== today) {
      const timer = setTimeout(() => setShowMorning(true), 2000);
      return () => clearTimeout(timer);
    }
    // Show evening modal if: it's after 7pm, Slight Edge log not done today
    const alreadyLogged = dailyCalendarEntries.some(e => e.date === today);
    if (hour >= 19 && !alreadyLogged) {
      const timer = setTimeout(() => setShowEvening(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [hour, lastIntentionDate, dailyCalendarEntries, today]);

  const handleMorningSubmit = () => {
    if (!intention.trim()) return;
    setDailyIntention(intention, energyRating);
    triggerXPFloat('+10 XP', '#4ade80');
    addToast(`Intention set! +10 XP. Go make it happen! 🎯`, 'success');
    setShowMorning(false);
  };

  const handleEveningSubmit = () => {
    const today2 = new Date().toISOString().split('T')[0];
    const summary = slightEdgeSummary.trim() || todayIntention || '';
    const learned = slightEdgeLearned.trim();

    addOrUpdateCalendarEntry(today2, true, summary, learned, productivityScore);

    const xpEarned = 3;
    triggerXPFloat(`+${xpEarned} XP`, '#4ade80');
    addToast(`Slight Edge day logged! +${xpEarned} XP. See you tomorrow!`, 'success');
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

      {/* Evening Slight Edge Log Modal */}
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
                <BookOpen className="inline text-[var(--color-green)] mb-2" size={36} />
                <h2 className="text-xl font-bold">Daily Slight Edge Log</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Log your day — small consistent actions compound over time.
                </p>
                {todayIntention && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Today&apos;s intention: <span className="text-[var(--color-purple)] italic">&quot;{todayIntention}&quot;</span>
                  </p>
                )}
              </div>

              <div className="space-y-5">
                {/* Productivity score 1-10 */}
                <div>
                  <label className="text-sm font-semibold block mb-2">Productivity Score</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={productivityScore}
                      onChange={e => setProductivityScore(Number(e.target.value))}
                      className="flex-1 accent-[var(--color-green)]"
                    />
                    <span className="text-lg font-bold min-w-[2ch] text-center" style={{ color: `hsl(${(productivityScore - 1) * 12}, 80%, 50%)` }}>
                      {productivityScore}
                    </span>
                  </div>
                  <p className="text-center text-xs text-[var(--color-text-muted)] mt-1">
                    {PRODUCTIVITY_LABELS[productivityScore]}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">What did you do today?</label>
                  <textarea
                    value={slightEdgeSummary}
                    onChange={e => setSlightEdgeSummary(e.target.value)}
                    placeholder="e.g., Studied 2 chapters, went to the gym, worked on project..."
                    className="input-field min-h-[70px] resize-none text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">What did you learn? (optional)</label>
                  <textarea
                    value={slightEdgeLearned}
                    onChange={e => setSlightEdgeLearned(e.target.value)}
                    placeholder="Key takeaway or insight from today..."
                    className="input-field min-h-[60px] resize-none text-sm"
                  />
                </div>

                <motion.button
                  onClick={handleEveningSubmit}
                  className="w-full rpg-button !bg-[var(--color-green)] !text-white font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <BookOpen size={16} /> Log Today&apos;s Slight Edge
                </motion.button>

                <button
                  onClick={() => setShowEvening(false)}
                  className="w-full text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors py-2"
                >
                  Not now — I&apos;ll log later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
