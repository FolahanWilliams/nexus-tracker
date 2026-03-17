'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

export const useAmbientSound = () => {
    const { settings, isMusicDucked } = useGameStore();
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const pendingInitRef = useRef(false);

    // Initialises the ambient sound nodes. Must only be called after a user
    // gesture so the AudioContext isn't blocked by Chrome's autoplay policy.
    const initAmbient = useCallback(() => {
        if (sourceRef.current) return; // already running

        if (!audioContextRef.current) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioContextRef.current = new AudioCtx();
        }

        const ctx = audioContextRef.current;
        const sampleRate = ctx.sampleRate;
        const duration = 10; // 10 second loop
        const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // Generate "Pinkish" Noise / Ambient Pad
        let lastOut = 0;
        for (let i = 0; i < buffer.length; i++) {
            const white = Math.random() * 2 - 1;
            const out = (lastOut + (0.02 * white)) / 1.02;
            lastOut = out;

            const t = i / sampleRate;
            const movement = Math.sin(2 * Math.PI * 0.1 * t) * 0.1;
            data[i] = (out + movement) * 0.5;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0; // Start muted

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();

        sourceRef.current = source;
        gainNodeRef.current = gainNode;
        pendingInitRef.current = false;
    }, []);

    // Defer AudioContext creation until a user gesture to comply with
    // Chrome's autoplay policy.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (settings.musicEnabled && !sourceRef.current && !pendingInitRef.current) {
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
            let volumeScale = settings.musicEnabled ? (settings.musicVolume ?? 0.3) * 0.2 : 0;
            if (isMusicDucked) volumeScale *= 0.3;
            gainNodeRef.current.gain.setTargetAtTime(volumeScale, audioContextRef.current.currentTime, 0.5);
        }
    }, [settings.musicEnabled, settings.musicVolume, isMusicDucked]);

    return null;
};

export default useAmbientSound;
