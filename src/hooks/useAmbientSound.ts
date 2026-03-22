'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

export const useAmbientSound = () => {
    const { settings, isMusicDucked } = useGameStore();
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodesRef = useRef<OscillatorNode[]>([]);
    const gainNodeRef = useRef<GainNode | null>(null);
    const pendingInitRef = useRef(false);

    // Initialises a soft harmonic pad. Must only be called after a user
    // gesture so the AudioContext isn't blocked by Chrome's autoplay policy.
    const initAmbient = useCallback(() => {
        if (sourceNodesRef.current.length > 0) return; // already running

        if (!audioContextRef.current) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioContextRef.current = new AudioCtx();
        }

        const ctx = audioContextRef.current;

        // Master gain
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0; // Start silent
        masterGain.connect(ctx.destination);
        gainNodeRef.current = masterGain;

        // Soft harmonic pad — layered sine waves at consonant intervals
        // Creates a warm, non-intrusive ambient bed (not noise)
        const fundamentals = [
            { freq: 65.41, gain: 0.12 },   // C2 — deep bass root
            { freq: 98.00, gain: 0.10 },   // G2 — fifth
            { freq: 130.81, gain: 0.06 },  // C3 — octave
            { freq: 164.81, gain: 0.04 },  // E3 — major third (warmth)
            { freq: 196.00, gain: 0.03 },  // G3 — fifth up
        ];

        const oscillators: OscillatorNode[] = [];

        for (const { freq, gain: vol } of fundamentals) {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;
            oscGain.gain.value = vol;

            // Subtle LFO for gentle movement (very slow vibrato)
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.05 + Math.random() * 0.05; // 0.05-0.1 Hz
            lfoGain.gain.value = freq * 0.003; // Very subtle pitch drift
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();

            osc.connect(oscGain);
            oscGain.connect(masterGain);
            osc.start();

            oscillators.push(osc);
        }

        sourceNodesRef.current = oscillators;
        pendingInitRef.current = false;
    }, []);

    // Defer AudioContext creation until a user gesture
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (settings.musicEnabled && sourceNodesRef.current.length === 0 && !pendingInitRef.current) {
            pendingInitRef.current = true;

            const onGesture = () => {
                cleanup();
                initAmbient();
            };

            const cleanup = () => {
                document.removeEventListener('click', onGesture);
                document.removeEventListener('keydown', onGesture);
                document.removeEventListener('pointerdown', onGesture);
            };

            document.addEventListener('click', onGesture, { once: true });
            document.addEventListener('keydown', onGesture, { once: true });
            document.addEventListener('pointerdown', onGesture, { once: true });

            return cleanup;
        }
    }, [settings.musicEnabled, initAmbient]);

    // Update volume based on settings
    useEffect(() => {
        if (gainNodeRef.current && audioContextRef.current) {
            let volumeScale = settings.musicEnabled ? (settings.musicVolume ?? 0.3) * 0.15 : 0;
            if (isMusicDucked) volumeScale *= 0.2;
            gainNodeRef.current.gain.setTargetAtTime(volumeScale, audioContextRef.current.currentTime, 0.8);
        }
    }, [settings.musicEnabled, settings.musicVolume, isMusicDucked]);

    // Cleanup on unmount — stop all oscillators and close AudioContext
    useEffect(() => {
        return () => {
            sourceNodesRef.current.forEach(osc => {
                try { osc.stop(); } catch { /* already stopped */ }
            });
            sourceNodesRef.current = [];
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            gainNodeRef.current = null;
        };
    }, []);

    return null;
};

export default useAmbientSound;
