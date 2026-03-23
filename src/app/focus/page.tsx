'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Pause, RotateCcw, Coffee, Zap, Target, CheckCircle, TreePine } from 'lucide-react';
import GrowingTree from '@/components/GrowingTree';

type TimerMode = 'focus' | 'short-break' | 'long-break';

const MODES: Record<TimerMode, { label: string; duration: number; color: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  'focus': { label: 'Focus', duration: 25 * 60, color: 'var(--color-purple)', icon: Zap },
  'short-break': { label: 'Short Break', duration: 5 * 60, color: 'var(--color-green)', icon: Coffee },
  'long-break': { label: 'Long Break', duration: 15 * 60, color: 'var(--color-blue)', icon: Coffee },
};

const XP_PER_FOCUS_SESSION = 30;
const SESSIONS_BEFORE_LONG_BREAK = 4;

const GROWTH_MILESTONES = [
  { threshold: 0, message: 'Plant the seed of focus...' },
  { threshold: 0.1, message: 'A sprout emerges!' },
  { threshold: 0.25, message: 'Your focus is taking root.' },
  { threshold: 0.5, message: 'Growing strong — keep it up!' },
  { threshold: 0.75, message: 'Almost in full bloom!' },
  { threshold: 0.95, message: 'Your tree is flourishing!' },
];

/** Request notification permission (call on user gesture) */
function requestNotificationPermission() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function FocusPage() {
  const {
    tasks, focusSessionsTotal, focusMinutesTotal,
    focusTimerEndTime, focusTimerPausedTimeLeft, focusTimerMode, focusTimerSessionCount,
    startFocusTimer, pauseFocusTimer, stopFocusTimer, setFocusTimerMode,
    activeFocusTaskId,
  } = useGameStore();

  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(activeFocusTaskId);
  const [displayTimeLeft, setDisplayTimeLeft] = useState(() => {
    if (focusTimerEndTime) return Math.max(0, Math.ceil((focusTimerEndTime - Date.now()) / 1000));
    if (focusTimerPausedTimeLeft != null) return focusTimerPausedTimeLeft;
    return MODES[focusTimerMode].duration;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode = focusTimerMode;
  const running = focusTimerEndTime != null;
  const sessionsThisSession = focusTimerSessionCount;

  // Derive display time when not running (avoids setState in effect)
  const timeLeft = !focusTimerEndTime && focusTimerPausedTimeLeft != null
    ? focusTimerPausedTimeLeft
    : displayTimeLeft;

  const incompleteTasks = tasks.filter(t => !t.completed);

  // Sync display from store on every tick
  useEffect(() => {
    if (!focusTimerEndTime) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    // Timer is running — tick display every second
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((focusTimerEndTime - Date.now()) / 1000));
      setDisplayTimeLeft(remaining);

      if (remaining <= 0) {
        // Timer completed — handled by BackgroundTimerManager
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    };
    tick(); // immediate
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [focusTimerEndTime]);

  const handleToggle = () => {
    requestNotificationPermission();
    if (running) {
      // Pause
      const remaining = Math.max(0, Math.ceil((focusTimerEndTime! - Date.now()) / 1000));
      pauseFocusTimer(remaining);
    } else {
      // Start/resume
      const duration = focusTimerPausedTimeLeft ?? MODES[mode].duration;
      startFocusTimer(mode, duration, linkedTaskId);
    }
  };

  const handleModeChange = (newMode: TimerMode) => {
    setFocusTimerMode(newMode, MODES[newMode].duration);
    setDisplayTimeLeft(MODES[newMode].duration);
  };

  const handleReset = () => {
    stopFocusTimer();
    setFocusTimerMode(mode, MODES[mode].duration);
    setDisplayTimeLeft(MODES[mode].duration);
  };

  const currentMode = MODES[mode];
  const progress = 1 - timeLeft / currentMode.duration;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // SVG circle progress
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const milestoneMessage = useMemo(() => {
    let msg = GROWTH_MILESTONES[0].message;
    for (const m of GROWTH_MILESTONES) {
      if (progress >= m.threshold) msg = m.message;
    }
    return msg;
  }, [progress]);

  const linkedTask = incompleteTasks.find(t => t.id === linkedTaskId);

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Focus Timer</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Mode selector */}
        <div className="flex gap-2 bg-[var(--color-bg-dark)] p-1 rounded-xl">
          {(Object.entries(MODES) as [TimerMode, typeof MODES[TimerMode]][]).map(([key, m]) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${mode === key
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer Circle */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg width="220" height="220" className="-rotate-90">
              {/* Background ring */}
              <circle
                cx="110" cy="110" r={radius}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
                opacity={0.3}
              />
              {/* Progress ring */}
              <motion.circle
                cx="110" cy="110" r={radius}
                fill="none"
                stroke={currentMode.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transition={{ duration: 0.5 }}
              />
            </svg>

            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.p
                className="text-5xl font-bold font-mono tabular-nums"
                key={`${minutes}:${seconds}`}
              >
                {pad(minutes)}:{pad(seconds)}
              </motion.p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1" style={{ color: currentMode.color }}>
                {currentMode.label}
              </p>
            </div>
          </div>

          {/* Session dots */}
          <div className="flex gap-2 mt-4">
            {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${i < (sessionsThisSession % SESSIONS_BEFORE_LONG_BREAK)
                  ? 'bg-[var(--color-purple)]'
                  : 'bg-[var(--color-border)]'
                  }`}
                animate={i < (sessionsThisSession % SESSIONS_BEFORE_LONG_BREAK) ? {
                  scale: [1, 1.2, 1],
                } : {}}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Session {(sessionsThisSession % SESSIONS_BEFORE_LONG_BREAK) + 1} of {SESSIONS_BEFORE_LONG_BREAK}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <motion.button
            onClick={handleReset}
            className="p-3 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Reset timer"
          >
            <RotateCcw size={22} />
          </motion.button>

          <motion.button
            onClick={handleToggle}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
            style={{ backgroundColor: currentMode.color }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={running ? 'Pause timer' : 'Start timer'}
          >
            {running ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </motion.button>

          <div className="w-12" /> {/* spacer */}
        </div>

        {/* Growing Tree — separate section below the timer */}
        <motion.div
          className="rpg-card !p-4 overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TreePine size={16} className="text-[var(--color-green)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">Focus Garden</p>
            </div>
            {/* Growth milestone message */}
            <motion.p
              key={milestoneMessage}
              className="text-xs text-[var(--color-text-muted)] italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {milestoneMessage}
            </motion.p>
          </div>
          <GrowingTree
            progress={progress}
            running={running}
            mode={mode}
          />
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rpg-card text-center !p-3">
            <p className="text-xl font-bold text-[var(--color-purple)]">{focusSessionsTotal}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Total Sessions</p>
          </div>
          <div className="rpg-card text-center !p-3">
            <p className="text-xl font-bold text-[var(--color-green)]">{focusMinutesTotal}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Total Minutes</p>
          </div>
          <div className="rpg-card text-center !p-3">
            <p className="text-xl font-bold text-[var(--color-yellow)]">{focusSessionsTotal * XP_PER_FOCUS_SESSION}</p>
            <p className="text-xs text-[var(--color-text-muted)]">XP Earned</p>
          </div>
        </div>

        {/* Link to a quest */}
        <div className="rpg-card">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Target size={18} className="text-[var(--color-orange)]" />
            Link to Quest
          </h2>
          {linkedTask ? (
            <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-dark)] rounded-lg">
              <CheckCircle size={18} className="text-[var(--color-purple)]" />
              <p className="flex-1 text-sm font-medium truncate">{linkedTask.title}</p>
              <button
                onClick={() => setLinkedTaskId(null)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
              >
                Unlink
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {incompleteTasks.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                  No active quests. Add quests to link them here.
                </p>
              ) : (
                incompleteTasks.slice(0, 8).map(task => (
                  <button
                    key={task.id}
                    onClick={() => setLinkedTaskId(task.id)}
                    className="w-full text-left p-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-purple)] hover:bg-[var(--color-purple)]/10 transition-all text-sm"
                  >
                    <span className="font-medium truncate block">{task.title}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{task.difficulty} · +{task.xpReward} XP</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tip */}
        <motion.div
          className="rpg-card border-l-4 !border-l-[var(--color-purple)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-[var(--color-text-secondary)] italic">
            {mode === 'focus'
              ? '🧠 Eliminate distractions. No phone. No social media. Full focus for 25 minutes.'
              : mode === 'short-break'
                ? '☕ Step away from the screen. Stretch, breathe, hydrate.'
                : '🚶 Take a longer break. Go for a walk. Your brain needs recovery.'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
