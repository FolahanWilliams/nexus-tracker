'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, Mic, MicOff, Play, Square, Clock,
  CheckCircle, AlertTriangle, BarChart3, Sparkles, MessageCircle,
} from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

interface SpeakingPrompt {
  topic: string;
  difficulty: string;
  prepTime: number;
  speakTime: number;
}

interface SpeechResult {
  score: number;
  vocabDiversity: number;
  structure: number;
  clarity: number;
  coherence: number;
  vocabUsage: number;
  fillerCount: number;
  fillerWords: string[];
  wordCount: number;
  sentenceCount: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  vocabWordsUsed: string[];
}

type Phase = 'idle' | 'loading' | 'prep' | 'recording' | 'transcribing' | 'analyzing' | 'result';

export default function ImpromptuSpeaking({ vocabWords }: { vocabWords: string[] }) {
  const { addXP, logActivity } = useGameStore();
  const { addToast } = useToastStore();

  const [phase, setPhase] = useState<Phase>('idle');
  const [prompts, setPrompts] = useState<SpeakingPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SpeakingPrompt | null>(null);
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);
  const [speakTimeLeft, setSpeakTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<SpeechResult | null>(null);
  const [micError, setMicError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (speakTimerRef.current) clearInterval(speakTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const generatePrompts = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'speaking', action: 'generate_prompt', vocabWords: vocabWords.slice(0, 15) }),
      });
      const data = await res.json();
      if (data.prompts?.length > 0) {
        setPrompts(data.prompts);
        setPhase('idle');
      } else {
        addToast('Could not generate prompts.', 'error');
        setPhase('idle');
      }
    } catch {
      addToast('Network error.', 'error');
      setPhase('idle');
    }
  };

  const startPrep = (prompt: SpeakingPrompt) => {
    setSelectedPrompt(prompt);
    setTranscript('');
    setResult(null);
    setMicError('');
    setPrepTimeLeft(prompt.prepTime);
    setSpeakTimeLeft(prompt.speakTime);
    setPhase('prep');

    let timeLeft = prompt.prepTime;
    prepTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      setPrepTimeLeft(timeLeft);
      if (timeLeft <= 0) {
        if (prepTimerRef.current) clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
        startRecording(prompt);
      }
    }, 1000);
  };

  const startRecording = useCallback(async (prompt: SpeakingPrompt) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // collect data every second
      setPhase('recording');

      let timeLeft = prompt.speakTime;
      speakTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setSpeakTimeLeft(timeLeft);
        if (timeLeft <= 0) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setMicError('Could not access microphone. Please allow microphone access and try again.');
      setPhase('idle');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (speakTimerRef.current) {
      clearInterval(speakTimerRef.current);
      speakTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();

      // Wait for final data to be collected, then transcribe
      recorder.addEventListener('stop', async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(blob);
      }, { once: true });
    }
  }, []);

  const transcribeAudio = async (audioBlob: Blob) => {
    setPhase('transcribing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch('/api/mindforge/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.text) {
        setTranscript(data.text);
        await analyzeSpeech(data.text);
      } else {
        addToast('Transcription failed.', 'error');
        setPhase('idle');
      }
    } catch {
      addToast('Transcription error.', 'error');
      setPhase('idle');
    }
  };

  const analyzeSpeech = async (text: string) => {
    if (!selectedPrompt) return;
    setPhase('analyzing');
    try {
      const res = await fetch('/api/mindforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'speaking',
          action: 'analyze',
          transcript: text,
          topic: selectedPrompt.topic,
          vocabWords: vocabWords.slice(0, 15),
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setPhase('result');
        const xp = Math.round(data.result.score / 5) + 5;
        addXP(xp);
        triggerXPFloat(`+${xp} XP`, '#4ade80');
        logActivity('xp_earned', '🎤', `Impromptu Speaking: ${data.result.score}/100`, selectedPrompt.topic.slice(0, 50));
      } else {
        addToast('Could not analyze speech.', 'error');
        setPhase('idle');
      }
    } catch {
      addToast('Analysis error.', 'error');
      setPhase('idle');
    }
  };

  const skipPrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    prepTimerRef.current = null;
    if (selectedPrompt) startRecording(selectedPrompt);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── IDLE ──
  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Mic size={18} className="text-[var(--color-green)]" />
            <h2 className="text-sm font-bold">Impromptu Speaking</h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Get a random topic, prepare for 30 seconds, then speak for 1-2 minutes. AI transcribes your speech and gives detailed feedback on vocabulary, structure, and filler words.
          </p>

          {micError && (
            <div className="p-2.5 rounded-lg bg-[var(--color-red)]/10 border border-[var(--color-red)]/20 mb-3">
              <p className="text-xs text-[var(--color-red)]">{micError}</p>
            </div>
          )}

          {prompts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Choose a topic</p>
              {prompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => startPrep(p)}
                  className="w-full text-left p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] hover:border-[var(--color-green)]/40 transition-all"
                >
                  <p className="text-sm text-white">{p.topic}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{
                      color: p.difficulty === 'beginner' ? 'var(--color-green)' : p.difficulty === 'intermediate' ? 'var(--color-blue)' : 'var(--color-orange)',
                      background: p.difficulty === 'beginner' ? 'rgba(74,222,128,0.1)' : p.difficulty === 'intermediate' ? 'rgba(59,130,246,0.1)' : 'rgba(251,146,60,0.1)',
                    }}>{p.difficulty}</span>
                    <span className="text-[9px] text-[var(--color-text-muted)]">
                      {p.prepTime}s prep &middot; {p.speakTime}s speak
                    </span>
                  </div>
                </button>
              ))}
              <button onClick={generatePrompts} className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">
                Generate new topics
              </button>
            </div>
          ) : (
            <button
              onClick={generatePrompts}
              className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-green)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Mic size={14} /> Generate Speaking Prompts
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="text-sm">Generating topics...</p>
      </div>
    );
  }

  // ── PREP PHASE ──
  if (phase === 'prep' && selectedPrompt) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-green)]/10 border border-[var(--color-green)]/20 text-center">
          <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-2">Your Topic</p>
          <p className="text-lg text-white">{selectedPrompt.topic}</p>
        </div>

        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={20} className="text-[var(--color-orange)]" />
            <span className="text-[10px] uppercase font-bold text-[var(--color-orange)] tracking-wider">Preparation Time</span>
          </div>
          <motion.p
            key={prepTimeLeft}
            initial={{ scale: 1.2, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl font-bold text-white"
          >
            {formatTime(prepTimeLeft)}
          </motion.p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-3">
            Organize your thoughts. Think about structure: introduction, main points, conclusion.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (prepTimerRef.current) clearInterval(prepTimerRef.current);
              setPhase('idle');
            }}
            className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={skipPrep}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-green)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Play size={14} /> Start Speaking Now
          </button>
        </div>
      </div>
    );
  }

  // ── RECORDING ──
  if (phase === 'recording' && selectedPrompt) {
    const progress = 1 - (speakTimeLeft / selectedPrompt.speakTime);
    const isLow = speakTimeLeft <= 10;

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mb-1">Topic</p>
          <p className="text-sm text-white">{selectedPrompt.topic}</p>
        </div>

        <div className="text-center py-8">
          {/* Pulsing mic indicator */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <motion.div
              className="absolute rounded-full bg-[var(--color-red)]/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 80, height: 80 }}
            />
            <div className="w-16 h-16 rounded-full bg-[var(--color-red)] flex items-center justify-center z-10">
              <Mic size={28} className="text-white" />
            </div>
          </div>

          <p className="text-[10px] uppercase font-bold text-[var(--color-red)] tracking-wider mb-1">Recording</p>
          <motion.p
            key={speakTimeLeft}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold"
            style={{ color: isLow ? 'var(--color-orange)' : 'white' }}
          >
            {formatTime(speakTimeLeft)}
          </motion.p>

          {/* Progress bar */}
          <div className="w-48 mx-auto mt-3 h-1.5 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: isLow ? 'var(--color-orange)' : 'var(--color-green)' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {isLow && (
            <p className="text-xs text-[var(--color-orange)] mt-2">Wrap up your thoughts!</p>
          )}
        </div>

        <button
          onClick={stopRecording}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-red)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Square size={14} /> Stop Recording
        </button>
      </div>
    );
  }

  // ── TRANSCRIBING / ANALYZING ──
  if (phase === 'transcribing' || phase === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="text-sm">
          {phase === 'transcribing' ? 'Transcribing your speech...' : 'Analyzing your articulation...'}
        </p>
        {phase === 'analyzing' && transcript && (
          <div className="mt-4 max-w-md p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mb-1">Transcript</p>
            <p className="text-xs text-[var(--color-text-secondary)] italic line-clamp-3">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && result && selectedPrompt) {
    const dims = [
      { key: 'vocabDiversity' as const, label: 'Vocabulary', icon: Sparkles, color: 'var(--color-purple)' },
      { key: 'structure' as const, label: 'Structure', icon: BarChart3, color: 'var(--color-blue)' },
      { key: 'clarity' as const, label: 'Clarity', icon: CheckCircle, color: 'var(--color-green)' },
      { key: 'coherence' as const, label: 'Coherence', icon: MessageCircle, color: 'var(--color-orange)' },
    ];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Score header */}
        <div className="text-center py-6 p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="text-4xl mb-2">{result.score >= 80 ? '🎤' : result.score >= 60 ? '💬' : '📢'}</div>
          <p className="text-2xl font-bold" style={{
            color: result.score >= 80 ? 'var(--color-green)' : result.score >= 60 ? 'var(--color-orange)' : 'var(--color-red)',
          }}>{result.score}/100</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{result.feedback}</p>
        </div>

        {/* Dimension scores */}
        <div className="grid grid-cols-2 gap-2">
          {dims.map(d => {
            const val = result[d.key];
            return (
              <div key={d.key} className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <d.icon size={12} style={{ color: d.color }} />
                  <span className="text-[10px] uppercase font-bold" style={{ color: d.color }}>{d.label}</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex-1 h-1.5 rounded-full" style={{
                      background: i <= val ? d.color : 'var(--color-bg-hover)',
                    }} />
                  ))}
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">{val}/5</span>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
            <p className="text-lg font-bold text-white">{result.wordCount}</p>
            <p className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Words</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
            <p className="text-lg font-bold text-white">{result.sentenceCount}</p>
            <p className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Sentences</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
            <p className="text-lg font-bold" style={{
              color: result.fillerCount <= 2 ? 'var(--color-green)' : result.fillerCount <= 5 ? 'var(--color-orange)' : 'var(--color-red)',
            }}>{result.fillerCount}</p>
            <p className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Fillers</p>
          </div>
        </div>

        {/* Filler words detail */}
        {result.fillerCount > 0 && result.fillerWords?.length > 0 && (
          <div className="p-2.5 rounded-lg bg-[var(--color-orange)]/10 border border-[var(--color-orange)]/20">
            <p className="text-[10px] uppercase font-bold text-[var(--color-orange)] mb-1">Filler Words Detected</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {result.fillerWords.map((w, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  <span className="font-bold text-[var(--color-orange)]">&ldquo;{w}&rdquo;</span>
                </span>
              ))}
            </p>
          </div>
        )}

        {/* Vocab usage bonus */}
        {result.vocabUsage > 0 && (
          <div className="p-2.5 rounded-lg bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 text-center">
            <p className="text-[10px] uppercase font-bold text-[var(--color-purple)]">
              Vocabulary Bonus: {result.vocabUsage}/5 words used!
            </p>
            {result.vocabWordsUsed?.length > 0 && (
              <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                Used: {result.vocabWordsUsed.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mb-1.5">Your Transcript</p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle size={10} /> Strengths
            </p>
            {result.strengths?.map((s, i) => (
              <p key={i} className="text-xs text-[var(--color-text-secondary)] mb-1">&bull; {s}</p>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase font-bold text-[var(--color-orange)] tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> Improve
            </p>
            {result.improvements?.map((s, i) => (
              <p key={i} className="text-xs text-[var(--color-text-secondary)] mb-1">&bull; {s}</p>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setPhase('idle'); setPrompts([]); }}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          Try Another Topic
        </button>
      </motion.div>
    );
  }

  return null;
}
