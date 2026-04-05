/**
 * Push-to-talk voice recording hook for the HootDumpCard.
 *
 * User presses and holds the mic button → we request mic permission, start
 * a MediaRecorder in webm/opus, and accumulate chunks. On release we stop,
 * POST the blob to /api/mindforge/transcribe (Whisper), and hand the
 * transcript back via onTranscript.
 */

import { useCallback, useRef, useState } from 'react';
import { useToastStore } from '@/components/ToastContainer';
import { logger } from '@/lib/logger';

interface UseVoiceDumpOptions {
    onTranscript: (text: string) => void;
}

interface UseVoiceDumpReturn {
    isRecording: boolean;
    transcribing: boolean;
    supported: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
}

export function useVoiceDump({ onTranscript }: UseVoiceDumpOptions): UseVoiceDumpReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const { addToast } = useToastStore();

    const supported =
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined';

    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
    }, []);

    const startRecording = useCallback(async () => {
        if (!supported) {
            addToast('Voice input not supported in this browser', 'error');
            return;
        }
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            // Prefer webm/opus for Whisper compatibility.
            const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : '';
            const recorder = mime
                ? new MediaRecorder(stream, { mimeType: mime })
                : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                cleanup();
                if (blob.size === 0) {
                    setTranscribing(false);
                    return;
                }
                setTranscribing(true);
                try {
                    const fd = new FormData();
                    fd.append('audio', blob, 'voice-dump.webm');
                    const res = await fetch('/api/mindforge/transcribe', {
                        method: 'POST',
                        body: fd,
                    });
                    if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
                    const data = await res.json();
                    const text = (data?.text as string | undefined)?.trim();
                    if (text) {
                        onTranscript(text);
                    } else {
                        addToast("Couldn't hear anything — try again?", 'info');
                    }
                } catch (err) {
                    logger.error('Voice dump transcription error', 'useVoiceDump', err);
                    addToast('Transcription failed — type instead?', 'error');
                } finally {
                    setTranscribing(false);
                }
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            logger.error('Voice dump recording error', 'useVoiceDump', err);
            addToast('Mic access denied', 'error');
            cleanup();
        }
    }, [supported, isRecording, addToast, cleanup, onTranscript]);

    const stopRecording = useCallback(() => {
        if (!isRecording) return;
        setIsRecording(false);
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
            try {
                rec.stop();
            } catch (err) {
                logger.error('MediaRecorder stop error', 'useVoiceDump', err);
                cleanup();
            }
        } else {
            cleanup();
        }
    }, [isRecording, cleanup]);

    return { isRecording, transcribing, supported, startRecording, stopRecording };
}
