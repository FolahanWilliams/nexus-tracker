'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';

// Sound effect types
type SoundType = 'click' | 'success' | 'error' | 'levelup' | 'quest' | 'achievement' | 'boss' | 'craft' | 'coin' | 'battle_clash' | 'ambient_wind' | 'level_fanfare' | 'hit' | 'victory';

// Audio context and sounds
const sounds: Record<SoundType, AudioBuffer | null> = {
  click: null,
  success: null,
  error: null,
  levelup: null,
  quest: null,
  achievement: null,
  boss: null,
  craft: null,
  coin: null,
  battle_clash: null,
  ambient_wind: null,
  level_fanfare: null,
  hit: null,
  victory: null,
};

let audioContext: AudioContext | null = null;

// Generate a rich synthetic sound
const generateSound = (type: SoundType): AudioBuffer => {
  if (!audioContext) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  const ctx = audioContext;
  const sampleRate = ctx.sampleRate;

  // Custom durations based on sound type
  const duration = {
    click: 0.1,
    success: 0.4,
    error: 0.3,
    levelup: 1.5,
    quest: 0.5,
    achievement: 1.0,
    boss: 0.8,
    craft: 0.6,
    coin: 0.3,
    battle_clash: 0.4,
    ambient_wind: 2.0,
    level_fanfare: 2.0,
    hit: 0.2,
    victory: 2.5,
  }[type];

  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  const baseFreq = {
    click: 440,
    success: 523.25, // C5
    error: 110,
    levelup: 440, // A4
    quest: 587.33, // D5
    achievement: 783.99, // G5
    boss: 82.41, // E2
    craft: 329.63, // E4
    coin: 987.77, // B5
    battle_clash: 150,
    ambient_wind: 200,
    level_fanfare: 261.63, // C4
    hit: 100,
    victory: 261.63,
  }[type];

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Synthesis Logic
    switch (type) {
      case 'coin':
        // High pitched "ping" with a slight frequency ramp
        sample = Math.sin(2 * Math.PI * (baseFreq + (t * 200)) * t);
        sample += 0.5 * Math.sin(4 * Math.PI * (baseFreq * 2.1) * t); // Harmonics
        break;

      case 'levelup':
      case 'level_fanfare':
      case 'victory':
        // Major chord arpeggio or fanfare
        const arpeggio = [1, 1.25, 1.5, 2]; // Major
        const currentNote = arpeggio[Math.floor(t * 10) % arpeggio.length];
        sample = Math.sin(2 * Math.PI * baseFreq * currentNote * t);
        sample += 0.3 * Math.sin(2 * Math.PI * baseFreq * currentNote * 2 * t);
        break;

      case 'boss':
      case 'battle_clash':
        // Noisy, aggressive FM synthesis
        const modulatorFreq = 40;
        const index = 50;
        const modulator = Math.sin(2 * Math.PI * modulatorFreq * t) * index;
        sample = Math.sin(2 * Math.PI * baseFreq * t + modulator);
        sample += (Math.random() * 2 - 1) * 0.1; // Add some noise
        break;

      case 'hit':
        // Low impact thump
        sample = Math.sin(2 * Math.PI * baseFreq * Math.exp(-t * 20) * t);
        break;

      case 'ambient_wind':
        // Filtered noise
        sample = (Math.random() * 2 - 1);
        const lfo = Math.sin(2 * Math.PI * 0.5 * t); // Move the wind
        sample *= (0.5 + 0.5 * lfo);
        break;

      case 'craft':
        // Metallic "clink" with resonant filter feel
        sample = Math.sin(2 * Math.PI * baseFreq * t);
        sample *= Math.sin(2 * Math.PI * 5 * t); // Tremolo
        break;

      default:
        // Basic sin wave for others
        sample = Math.sin(2 * Math.PI * baseFreq * t);
    }

    // Envelope logic
    let envelope = 1;
    const attack = 0.02;
    const decay = 0.1;
    const sustain = 0.4;
    const release = duration * 0.2;

    if (t < attack) {
      envelope = t / attack;
    } else if (t < attack + decay) {
      envelope = 1 - (1 - sustain) * ((t - attack) / decay);
    } else if (t < duration - release) {
      envelope = sustain;
    } else {
      envelope = sustain * (duration - t) / release;
    }

    data[i] = sample * envelope * 0.25;
  }

  return buffer;
};

// Initialize sounds
const initSounds = () => {
  if (typeof window === 'undefined') return;

  try {
    if (!audioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Generate all sounds
    (Object.keys(sounds) as SoundType[]).forEach(type => {
      sounds[type] = generateSound(type);
    });
  } catch {
    console.warn('Audio not supported');
  }
};

export const useSoundEffects = () => {
  const { settings } = useGameStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initSounds();
      initialized.current = true;
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!settings.soundEnabled || !audioContext || !sounds[type]) return;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const source = audioContext.createBufferSource();
      source.buffer = sounds[type];

      // Add a simple gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = settings.sfxVolume ?? 0.5;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(0);
    } catch {
      // Silently fail if audio fails
    }
  }, [settings.soundEnabled, settings.sfxVolume]);

  return {
    playSound,
    playClick: () => playSound('click'),
    playSuccess: () => playSound('success'),
    playError: () => playSound('error'),
    playLevelUp: () => playSound('levelup'),
    playQuest: () => playSound('quest'),
    playAchievement: () => playSound('achievement'),
    playBoss: () => playSound('boss'),
    playCraft: () => playSound('craft'),
    playCoin: () => playSound('coin'),
    playHit: () => playSound('hit'),
    playVictory: () => playSound('victory'),
  };
};

export default useSoundEffects;
