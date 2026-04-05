'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, BookOpen, Zap, Sparkles, Mail } from 'lucide-react';
import { validateIntention } from '@/lib/validation';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Legendary'];
const ENERGY_BG_CLASSES = [
  'bg-[var(--color-red)]',
  'bg-[var(--color-orange)]',
  'bg-[var(--color-yellow)]',
  'bg-[var(--color-green)]',
  'bg-[var(--color-purple)]',
];

const PRODUCTIVITY_LABELS = ['', 'Barely', 'Very Low', 'Low', 'Below Avg', 'Average', 'Above Avg', 'Good', 'Great', 'Excellent', 'Peak'];

export default function DailyIntention() {
  const {
    lastIntentionDate,
    todayIntention,
    setDailyIntention,
    addOrUpdateCalendarEntry,
    dailyCalendarEntries,
    identityLine,
    setMicroAction,
    setOutreachBlock,
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

  // Micro-action extraction state
  const [microText, setMicroText] = useState('');
  const [microLoading, setMicroLoading] = useState(false);
  const [microLocked, setMicroLocked] = useState(false);

  // Outreach block state (staged after micro-action is set, energy ≥ 4)
  const [blockTime, setBlockTime] = useState('09:30');
  const [blockDuration, setBlockDuration] = useState(45);
  const [stagingTemplate, setStagingTemplate] = useState(false);
  const [stagedTemplate, setStagedTemplate] = useState<string | null>(null);

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

  const extractMicroAction = useCallback(async () => {
    if (!intention.trim()) return;
    setMicroLoading(true);
    try {
      const res = await fetch('/api/akrasia-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_micro_action', intention }),
      });
      const data = await res.json();
      const text = data?.microAction?.text || data?.text;
      if (text) {
        setMicroText(text);
        setMicroLocked(true);
      } else {
        addToast('Coach is offline — write your own 2-min action.', 'info');
      }
    } catch {
      addToast('Coach is offline — write your own 2-min action.', 'info');
    } finally {
      setMicroLoading(false);
    }
  }, [intention, addToast]);

  const stageTemplate = useCallback(async () => {
    if (!microText.trim()) return;
    setStagingTemplate(true);
    try {
      const res = await fetch('/api/akrasia-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stage_template',
          target: microText,
          context: intention,
        }),
      });
      const data = await res.json();
      if (data?.template) setStagedTemplate(data.template);
    } catch {
      // silent — stage is optional
    } finally {
      setStagingTemplate(false);
    }
  }, [microText, intention]);

  const handleMorningSubmit = () => {
    let sanitized: string;
    try {
      sanitized = validateIntention(intention);
    } catch {
      return;
    }
    setDailyIntention(sanitized, energyRating);

    // Persist micro-action if one was extracted
    const today = toLocalDateStr(new Date());
    if (microText.trim()) {
      setMicroAction(today, {
        text: microText.trim().slice(0, 500),
        estimatedMinutes: 2,
        status: 'pending',
        generatedFrom: sanitized,
        createdAt: new Date().toISOString(),
      });
    }

    // Schedule outreach block if energy is high enough and template is staged
    if (energyRating >= 4 && microText.trim()) {
      setOutreachBlock(today, {
        startTime: blockTime,
        durationMinutes: blockDuration,
        stagedTemplate: stagedTemplate ?? undefined,
        completed: false,
      });
    }

    triggerXPFloat('+10 XP', '#4ade80');
    addToast(`Intention set! +10 XP. Go make it happen! 🎯`, 'success');
    setShowMorning(false);
    // Reset local state
    setMicroText('');
    setMicroLocked(false);
    setStagedTemplate(null);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-4"
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
                {identityLine ? (
                  <p className="text-xs text-[var(--color-purple)] italic mt-2 px-4 leading-relaxed">
                    Cast your vote today as:<br />
                    <span className="text-[var(--color-text-primary)] font-semibold not-italic">&ldquo;{identityLine}&rdquo;</span>
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">What&apos;s your #1 focus today?</p>
                )}
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
                          ? `border-transparent text-white ${ENERGY_BG_CLASSES[i]}`
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Two-Minute Extract */}
                <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[var(--color-purple)]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                      Stupidly-small next action (≤ 2 min)
                    </p>
                  </div>
                  {!microLocked ? (
                    <button
                      type="button"
                      onClick={extractMicroAction}
                      disabled={!intention.trim() || microLoading}
                      className="w-full rpg-button text-xs py-2 disabled:opacity-40"
                    >
                      {microLoading ? 'Coach is thinking…' : '✨ Make this stupidly small'}
                    </button>
                  ) : (
                    <>
                      <textarea
                        value={microText}
                        onChange={e => setMicroText(e.target.value)}
                        className="input-field text-xs min-h-[50px] resize-none"
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={extractMicroAction}
                          disabled={microLoading}
                          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline"
                        >
                          regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMicroLocked(false); setMicroText(''); }}
                          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline ml-auto"
                        >
                          clear
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Energy-locked outreach block (only if energy ≥ 4 + micro set) */}
                {energyRating >= 4 && microText.trim() && (
                  <div className="p-3 rounded-xl bg-[var(--color-blue)]/10 border border-[var(--color-blue)]/40 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-[var(--color-blue)]" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-blue)]">
                        Energy-locked outreach block
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={blockTime}
                        onChange={e => setBlockTime(e.target.value)}
                        className="input-field text-xs"
                      />
                      <select
                        value={blockDuration}
                        onChange={e => setBlockDuration(Number(e.target.value))}
                        className="input-field text-xs"
                      >
                        <option value={25}>25 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                    </div>
                    {!stagedTemplate ? (
                      <button
                        type="button"
                        onClick={stageTemplate}
                        disabled={stagingTemplate}
                        className="w-full text-[10px] text-[var(--color-blue)] hover:text-[var(--color-blue-light,var(--color-blue))] underline disabled:opacity-50"
                      >
                        {stagingTemplate ? 'Drafting template…' : '✨ Pre-draft a template'}
                      </button>
                    ) : (
                      <div className="p-2 rounded bg-[var(--color-bg-dark)] text-[10px] text-[var(--color-text-secondary)] whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {stagedTemplate}
                      </div>
                    )}
                  </div>
                )}

                <motion.button
                  onClick={handleMorningSubmit}
                  disabled={!intention.trim()}
                  className="w-full rpg-button btn-primary font-bold"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-4"
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
                  className="w-full rpg-button btn-success font-bold"
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
