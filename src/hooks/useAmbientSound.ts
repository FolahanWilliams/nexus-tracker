'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

export const useAmbientSound = () => {
    const { settings } = useGameStore();
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initAmbient = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
                // Simple filter to make it "brown/pink" (low frequency emphasis)
                const out = (lastOut + (0.02 * white)) / 1.02;
                lastOut = out;

                // Add a very slow sine wave for "movement"
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
        };

        if (settings.musicEnabled && !sourceRef.current) {
            initAmbient();
        }

        // Update volume based on settings
        if (gainNodeRef.current) {
            const targetVolume = settings.musicEnabled ? (settings.musicVolume ?? 0.3) * 0.2 : 0;
            gainNodeRef.current.gain.setTargetAtTime(targetVolume, audioContextRef.current!.currentTime, 0.5);
        }

        return () => {
            if (sourceRef.current) {
                // sourceRef.current.stop(); // Keep it running if we just toggle volume? 
                // Actually, for a hook meant to be global, we might want to keep it persistent.
            }
        };
    }, [settings.musicEnabled, settings.musicVolume]);

    return null;
};

export default useAmbientSound;
