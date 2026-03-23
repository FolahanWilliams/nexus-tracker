'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

const XP_PER_FOCUS_SESSION = 30;
const GOLD_PER_FOCUS_SESSION = 10;
const SESSIONS_BEFORE_LONG_BREAK = 4;

const FOCUS_DURATION = 25 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;

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

/** Play alarm chime via Web Audio API */
let alarmAudioCtx: AudioContext | null = null;
function playAlarmSound() {
  try {
    if (!alarmAudioCtx || alarmAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      alarmAudioCtx = new AudioCtx();
    }
    if (alarmAudioCtx.state === 'suspended') alarmAudioCtx.resume();
    const ctx = alarmAudioCtx;

    const notes = [523.25, 659.25, 783.99];
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

/**
 * Runs globally in the app shell (ClientProviders).
 * Checks the store's focusTimerEndTime every second and triggers
 * session completion logic when the timer expires, regardless of
 * which page the user is currently viewing.
 */
export default function BackgroundTimerManager() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const state = useGameStore.getState();
      const { focusTimerEndTime, focusTimerMode, focusTimerSessionCount } = state;

      if (!focusTimerEndTime) return;

      const remaining = focusTimerEndTime - Date.now();
      if (remaining > 0) return;

      // Timer has expired — handle completion
      playAlarmSound();

      if (focusTimerMode === 'focus') {
        const newSessions = focusTimerSessionCount + 1;
        state.setFocusTimerSessionCount(newSessions);
        state.addFocusSession(25);
        state.addXP(XP_PER_FOCUS_SESSION);
        state.addGold(GOLD_PER_FOCUS_SESSION);
        triggerXPFloat(`+${XP_PER_FOCUS_SESSION} XP`, '#4ade80');
        setTimeout(() => triggerXPFloat(`+${GOLD_PER_FOCUS_SESSION} gold`, '#fbbf24'), 200);

        const isLongBreak = newSessions % SESSIONS_BEFORE_LONG_BREAK === 0;
        const nextMode = isLongBreak ? 'long-break' : 'short-break';
        const nextDuration = isLongBreak ? LONG_BREAK_DURATION : SHORT_BREAK_DURATION;

        const toastMsg = isLongBreak
          ? `Session ${newSessions} done! Long break time — you earned it!`
          : `Focus session done! +${XP_PER_FOCUS_SESSION} XP. Take a short break.`;
        addToast(toastMsg, 'success');

        sendTimerNotification(
          'Focus Session Complete!',
          isLongBreak
            ? `Session ${newSessions} done! Time for a long break.`
            : `+${XP_PER_FOCUS_SESSION} XP earned. Take a short break.`
        );

        // Transition to break (paused, ready to start)
        state.setFocusTimerMode(nextMode, nextDuration);
      } else {
        // Break finished
        addToast('Break over — back to work!', 'info');
        sendTimerNotification('Break Over!', 'Time to get back to work. Start your next focus session.');

        state.setFocusTimerMode('focus', FOCUS_DURATION);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [addToast]);

  return null;
}
