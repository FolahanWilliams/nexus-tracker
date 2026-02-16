'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';

// Sound effect types
type SoundType = 'click' | 'success' | 'error' | 'levelup' | 'quest' | 'achievement' | 'boss' | 'craft' | 'coin';

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
};

let audioContext: AudioContext | null = null;

// Generate a simple beep sound
const generateSound = (type: SoundType): AudioBuffer => {
  if (!audioContext) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  const ctx = audioContext;
  const sampleRate = ctx.sampleRate;
  const duration = type === 'levelup' ? 0.8 : type === 'boss' ? 0.5 : 0.15;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  const baseFreq = {
    click: 440,
    success: 523,
    error: 200,
    levelup: 440,
    quest: 587,
    achievement: 784,
    boss: 110,
    craft: 660,
    coin: 880,
  }[type];
  
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    const freq = type === 'levelup' 
      ? baseFreq + (i / buffer.length) * 200 
      : type === 'boss'
        ? baseFreq + Math.sin(t * 20) * 50
        : baseFreq;
    
    let envelope = 1;
    
    // ADSR envelope
    const attack = 0.01;
    const decay = 0.1;
    const sustain = type === 'success' || type === 'levelup' || type === 'achievement' ? 0.5 : 0.3;
    const release = duration - attack - decay;
    
    if (t < attack) {
      envelope = t / attack;
    } else if (t < attack + decay) {
      envelope = 1 - (1 - sustain) * ((t - attack) / decay);
    } else if (t < duration - release) {
      envelope = sustain;
    } else {
      envelope = sustain * (duration - t) / release;
    }
    
    // Wave type
    const wave = type === 'boss' 
      ? Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(4 * Math.PI * freq * t)
      : Math.sin(2 * Math.PI * freq * t);
    
    data[i] = wave * envelope * 0.3;
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
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = sounds[type];
      source.connect(audioContext.destination);
      source.start(0);
    } catch {
      // Silently fail if audio fails
    }
  }, [settings.soundEnabled]);
  
  const playClick = useCallback(() => playSound('click'), [playSound]);
  const playSuccess = useCallback(() => playSound('success'), [playSound]);
  const playError = useCallback(() => playSound('error'), [playSound]);
  const playLevelUp = useCallback(() => playSound('levelup'), [playSound]);
  const playQuest = useCallback(() => playSound('quest'), [playSound]);
  const playAchievement = useCallback(() => playSound('achievement'), [playSound]);
  const playBoss = useCallback(() => playSound('boss'), [playSound]);
  const playCraft = useCallback(() => playSound('craft'), [playSound]);
  const playCoin = useCallback(() => playSound('coin'), [playSound]);
  
  return {
    playSound,
    playClick,
    playSuccess,
    playError,
    playLevelUp,
    playQuest,
    playAchievement,
    playBoss,
    playCraft,
    playCoin,
  };
};

export default useSoundEffects;
