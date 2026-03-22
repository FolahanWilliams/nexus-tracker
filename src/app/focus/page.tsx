'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Pause, RotateCcw, Coffee, Zap, Target, CheckCircle, TreePine } from 'lucide-react';
import { triggerXPFloat } from '@/components/XPFloat';
import { useToastStore } from '@/components/ToastContainer';
import GrowingTree from '@/components/GrowingTree';

type TimerMode = 'focus' | 'short-break' | 'long-break';

const MODES: Record<TimerMode, { label: string; duration: number; color: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  'focus': { label: 'Focus', duration: 25 * 60, color: 'var(--color-purple)', icon: Zap },
  'short-break': { label: 'Short Break', duration: 5 * 60, color: 'var(--color-green)', icon: Coffee },
  'long-break': { label: 'Long Break', duration: 15 * 60, color: 'var(--color-blue)', icon: Coffee },
};

const XP_PER_FOCUS_SESSION = 30;
const GOLD_PER_FOCUS_SESSION = 10;
const SESSIONS_BEFORE_LONG_BREAK = 4;

const GROWTH_MILESTONES = [
  { threshold: 0, message: 'Plant the seed of focus...' },
  { threshold: 0.1, message: 'A sprout emerges!' },
  { threshold: 0.25, message: 'Your focus is taking root.' },
  { threshold: 0.5, message: 'Growing strong — keep it up!' },
  { threshold: 0.75, message: 'Almost in full bloom!' },
  { threshold: 0.95, message: 'Your tree is flourishing!' },
];

/** Lazily-created shared AudioContext for alarm sounds */
let alarmAudioCtx: AudioContext | null = null;
function getAlarmAudioCtx(): AudioContext {
  if (!alarmAudioCtx || alarmAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    alarmAudioCtx = new AudioCtx();
  }
  // Resume if suspended (Chrome autoplay policy)
  if (alarmAudioCtx.state === 'suspended') {
    alarmAudioCtx.resume();
  }
  return alarmAudioCtx;
}

/** Play a proper alarm sound using Web Audio API */
function playAlarmSound() {
  try {
    const ctx = getAlarmAudioCtx();

    // Three ascending chime tones
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.3 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.3);
      osc.stop(ctx.currentTime + i * 0.3 + 0.8);
    });

    // Final sustained chord
    setTimeout(() => {
      const chord = [523.25, 659.25, 783.99];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      });
    }, 1000);
  } catch {
    // Audio not supported
  }
}

/** Send a browser notification */
function sendTimerNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      tag: 'focus-timer',
    });
  } catch {
    // Notifications not supported in this context
  }
}

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
  const { tasks, addXP, addGold, addFocusSession, focusSessionsTotal, focusMinutesTotal, setFocusTimerRunning } = useGameStore();
  const { addToast } = useToastStore();

  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES['focus'].duration);
  const [running, setRunning] = useState(false);
  const [sessionsThisSession, setSessionsThisSession] = useState(0);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const incompleteTasks = tasks.filter(t => !t.completed);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const handleSessionComplete = useCallback(() => {
    stopTimer();
    setFocusTimerRunning(false, null);

    // Play alarm sound for all session completions
    playAlarmSound();

    if (mode === 'focus') {
      const newSessions = sessionsThisSession + 1;
      setSessionsThisSession(newSessions);
      addFocusSession(25);

      addXP(XP_PER_FOCUS_SESSION);
      addGold(GOLD_PER_FOCUS_SESSION);
      triggerXPFloat(`+${XP_PER_FOCUS_SESSION} XP`, '#4ade80');
      setTimeout(() => triggerXPFloat(`+${GOLD_PER_FOCUS_SESSION} 🪙`, '#fbbf24'), 200);

      const isLongBreak = newSessions % SESSIONS_BEFORE_LONG_BREAK === 0;
      const nextMode: TimerMode = isLongBreak ? 'long-break' : 'short-break';
      const toastMsg = isLongBreak
        ? `🎉 Session ${newSessions} done! Long break time — you earned it!`
        : `✅ Focus session done! +${XP_PER_FOCUS_SESSION} XP. Take a short break.`;

      addToast(toastMsg, 'success');
      sendTimerNotification(
        'Focus Session Complete!',
        isLongBreak
          ? `Session ${newSessions} done! Time for a long break.`
          : `+${XP_PER_FOCUS_SESSION} XP earned. Take a short break.`
      );

      setMode(nextMode);
      setTimeLeft(MODES[nextMode].duration);
    } else {
      addToast('Break over — back to work! 💪', 'info');
      sendTimerNotification('Break Over!', 'Time to get back to work. Start your next focus session.');
      setMode('focus');
      setTimeLeft(MODES['focus'].duration);
    }
  }, [mode, sessionsThisSession, stopTimer, addXP, addGold, addFocusSession, addToast, setFocusTimerRunning]);

  useEffect(() => {
    if (!running) {
      setFocusTimerRunning(false, null);
      return;
    }

    setFocusTimerRunning(true, linkedTaskId);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, handleSessionComplete, setFocusTimerRunning, linkedTaskId]);

  const handleModeChange = (newMode: TimerMode) => {
    stopTimer();
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  const handleReset = () => {
    stopTimer();
    setTimeLeft(MODES[mode].duration);
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
            onClick={() => {
              requestNotificationPermission();
              setRunning(v => !v);
            }}
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
