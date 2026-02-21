'use client';

import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, Sun, Moon, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Legendary'];
const ENERGY_COLORS = [
  'var(--color-red)', 'var(--color-orange)', 'var(--color-yellow)',
  'var(--color-green)', 'var(--color-purple)',
];

export default function ReflectionPage() {
  const {
    lastIntentionDate, lastReflectionDate,
    todayIntention, todayEnergyRating,
    setDailyIntention, addReflectionNote,
    tasks, reflectionNotes,
  } = useGameStore();
  const { addToast } = useToastStore();

  const today = new Date().toISOString().split('T')[0];
  const intentionSetToday = lastIntentionDate === today;
  const reflectionDoneToday = lastReflectionDate === today;

  const [intention, setIntention] = useState('');
  const [energyRating, setEnergyRating] = useState(3);
  const [reflectionNote, setReflectionNote] = useState('');
  const [stars, setStars] = useState(3);

  const handleMorningSubmit = () => {
    if (!intention.trim()) return;
    setDailyIntention(intention, energyRating);
    triggerXPFloat('+10 XP', '#4ade80');
    addToast('Intention set! +10 XP. Go make it happen! 🎯', 'success');
  };

  const handleEveningSubmit = () => {
    const completedToday = tasks.filter(t => t.completed && t.completedAt?.startsWith(today)).length;
    const xpBonus = stars * 10 + completedToday * 5;
    addReflectionNote(reflectionNote, stars, xpBonus);
    if (xpBonus > 0) triggerXPFloat(`+${xpBonus} XP`, '#4ade80');
    addToast(`Reflection complete! +${xpBonus} XP bonus. 🌙`, 'success');
  };

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Daily Check-In</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Morning Check-In ── */}
        <motion.div className="rpg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-5">
            <Sun className="text-[var(--color-yellow)]" size={22} />
            <h2 className="text-lg font-bold">Morning Check-In</h2>
            {intentionSetToday && (
              <span className="text-xs bg-[var(--color-green)]/20 text-[var(--color-green)] px-2 py-0.5 rounded-full font-semibold">
                Done ✓
              </span>
            )}
          </div>

          {intentionSetToday ? (
            <div className="p-4 bg-[var(--color-bg-dark)] rounded-lg space-y-1">
              <p className="text-xs text-[var(--color-text-muted)]">Today&apos;s intention</p>
              <p className="font-semibold italic">&ldquo;{todayIntention}&rdquo;</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Energy: <span style={{ color: ENERGY_COLORS[todayEnergyRating - 1] }} className="font-semibold">
                  {ENERGY_LABELS[todayEnergyRating - 1]}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Today&apos;s Intention</label>
                <input
                  type="text"
                  value={intention}
                  onChange={e => setIntention(e.target.value)}
                  placeholder="e.g., Finish Chapter 5 of my textbook"
                  className="input-field"
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
                      className="flex-1 py-2 rounded-lg text-xs font-bold border transition-all"
                      style={energyRating === i + 1
                        ? { backgroundColor: ENERGY_COLORS[i], color: 'white', borderColor: ENERGY_COLORS[i] }
                        : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
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
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                <Zap size={18} /> Set Intention &amp; Earn +10 XP
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* ── Evening Reflection ── */}
        <motion.div className="rpg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3 mb-5">
            <Moon className="text-[var(--color-blue)]" size={22} />
            <h2 className="text-lg font-bold">Evening Reflection</h2>
            {reflectionDoneToday && (
              <span className="text-xs bg-[var(--color-green)]/20 text-[var(--color-green)] px-2 py-0.5 rounded-full font-semibold">
                Done ✓
              </span>
            )}
          </div>

          {reflectionDoneToday ? (
            <div className="p-4 bg-[var(--color-bg-dark)] rounded-lg">
              <p className="text-sm text-[var(--color-text-muted)]">
                Reflection submitted for today. Come back tomorrow! 🌙
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayIntention && (
                <p className="text-sm text-[var(--color-text-muted)] italic border-l-2 border-[var(--color-purple)] pl-3">
                  Today&apos;s intention: &ldquo;{todayIntention}&rdquo;
                </p>
              )}
              <div>
                <label className="text-sm font-semibold block mb-3">How did today go?</label>
                <div className="flex gap-3 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <motion.button key={s} onClick={() => setStars(s)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} aria-label={`${s} stars`}>
                      <Star size={36} className={s <= stars ? 'text-[var(--color-yellow)]' : 'text-[var(--color-border)]'}
                        fill={s <= stars ? 'var(--color-yellow)' : 'none'} />
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-sm text-[var(--color-text-muted)] mt-1">
                  {['', 'Rough day', 'Could be better', 'Decent day', 'Great day!', 'LEGENDARY DAY! 🌟'][stars]}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Quick reflection <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                </label>
                <textarea
                  value={reflectionNote}
                  onChange={e => setReflectionNote(e.target.value)}
                  placeholder="What did you accomplish? What will you do better tomorrow?"
                  className="input-field min-h-[90px] resize-none text-sm"
                />
              </div>
              <motion.button
                onClick={handleEveningSubmit}
                className="w-full rpg-button !bg-[var(--color-blue)] !text-white font-bold"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                <Moon size={16} /> Submit Reflection &amp; Earn +{stars * 10}+ XP
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* ── Past Reflections ── */}
        {reflectionNotes.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Past Reflections</h2>
            <div className="space-y-3">
              {reflectionNotes.map((entry, i) => (
                <motion.div
                  key={i}
                  className="rpg-card !p-4"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                      {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={13}
                          className={s <= entry.stars ? 'text-[var(--color-yellow)]' : 'text-[var(--color-border)]'}
                          fill={s <= entry.stars ? 'var(--color-yellow)' : 'none'} />
                      ))}
                    </div>
                  </div>
                  {entry.note
                    ? <p className="text-sm text-[var(--color-text-secondary)]">{entry.note}</p>
                    : <p className="text-sm text-[var(--color-text-muted)] italic">No note recorded.</p>}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {reflectionNotes.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Moon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No reflections yet</p>
            <p className="text-sm mt-1">Submit your first evening reflection above to start tracking your days.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
