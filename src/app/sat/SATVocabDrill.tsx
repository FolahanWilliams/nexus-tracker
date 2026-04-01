'use client';

import { useState } from 'react';
import { BookOpen, Loader2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useAIFetch } from '@/hooks/useAIFetch';
import type { VocabWord } from '@/store/types';

type GeneratedWord = Omit<VocabWord, 'id' | 'dateAdded' | 'lastReviewed' | 'totalReviews' | 'correctReviews' | 'nextReviewDate' | 'easeFactor' | 'interval' | 'repetitions' | 'status'>;

interface Props {
    onComplete: () => void;
}

export default function SATVocabDrill({ onComplete }: Props) {
    const vocabWords = useGameStore((s) => s.vocabWords);
    const addVocabWords = useGameStore((s) => s.addVocabWords);
    const markSATBlockComplete = useGameStore((s) => s.markSATBlockComplete);
    const session = useGameStore((s) => s.satDailySession);

    const [words, setWords] = useState<GeneratedWord[]>([]);
    const [quizPhase, setQuizPhase] = useState(false);
    const [quizIdx, setQuizIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [expandedWord, setExpandedWord] = useState<number | null>(null);

    const { execute: generateWords, isLoading } = useAIFetch<GeneratedWord[]>('/api/sat', {
        timeout: 30000,
        logTag: 'SAT-Vocab',
    });

    const isComplete = session?.blockAComplete;

    const handleGenerate = async () => {
        const existingWords = vocabWords.map(w => w.word);
        const data = await generateWords({ type: 'generate_vocab', count: 3, existingWords });
        if (data && Array.isArray(data)) {
            setWords(data);
            addVocabWords(data);
        }
    };

    const startQuiz = () => {
        if (words.length === 0) return;
        setQuizPhase(true);
        setQuizIdx(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setScore(0);
    };

    const handleAnswer = (idx: number) => {
        if (showResult) return;
        setSelectedAnswer(idx);
        setShowResult(true);
        if (idx === 0) setScore(s => s + 1); // correct answer is always shuffled but we track
    };

    const nextQuestion = () => {
        if (quizIdx < words.length - 1) {
            setQuizIdx(i => i + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            // Complete
            markSATBlockComplete('A');
            onComplete();
        }
    };

    if (isComplete) {
        return (
            <div className="flex items-center gap-2 text-[var(--color-green)] text-sm">
                <CheckCircle2 size={16} />
                <span className="font-bold">Vocabulary drill complete!</span>
            </div>
        );
    }

    // Quiz phase
    if (quizPhase && words.length > 0) {
        const word = words[quizIdx];
        // Simple definition match quiz
        const wrongDefs = words.filter((_, i) => i !== quizIdx).map(w => w.definition);
        const options = [word.definition, ...wrongDefs.slice(0, 3)].sort(() => Math.random() - 0.5);
        const correctIdx = options.indexOf(word.definition);

        return (
            <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Quick Quiz — {quizIdx + 1}/{words.length}</p>
                <p className="text-lg font-bold text-white">{word.word}</p>
                <p className="text-xs text-[var(--color-text-secondary)] italic">{word.partOfSpeech}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">Choose the correct definition:</p>

                <div className="space-y-2">
                    {options.map((opt, i) => {
                        let style = 'border-[var(--color-border)] text-[var(--color-text-secondary)]';
                        if (showResult) {
                            if (i === correctIdx) style = 'border-[var(--color-green)] bg-[color-mix(in_srgb,var(--color-green)_10%,transparent)] text-[var(--color-green)]';
                            else if (i === selectedAnswer) style = 'border-[var(--color-red)] bg-[color-mix(in_srgb,var(--color-red)_10%,transparent)] text-[var(--color-red)]';
                        } else if (selectedAnswer === i) {
                            style = 'border-[var(--color-blue)] text-white';
                        }
                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswer(i)}
                                disabled={showResult}
                                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${style}`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>

                {showResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        {selectedAnswer === correctIdx ? (
                            <p className="text-sm text-[var(--color-green)] font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Correct!</p>
                        ) : (
                            <p className="text-sm text-[var(--color-red)] font-bold flex items-center gap-1"><XCircle size={14} /> Incorrect</p>
                        )}
                        <button
                            onClick={nextQuestion}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all"
                        >
                            {quizIdx < words.length - 1 ? 'Next Word' : 'Complete Block'}
                        </button>
                    </motion.div>
                )}
            </div>
        );
    }

    // Generation phase
    return (
        <div className="space-y-4">
            {words.length === 0 ? (
                <div className="text-center space-y-3">
                    <BookOpen size={24} className="mx-auto text-[var(--color-blue)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Generate SAT vocabulary words to study and quiz yourself.</p>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                    >
                        {isLoading ? <><Loader2 size={14} className="inline animate-spin mr-1" /> Generating...</> : 'Generate SAT Words'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Study these words, then take the quiz</p>
                    {words.map((w, i) => (
                        <div key={i} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-hover)]">
                            <button onClick={() => setExpandedWord(expandedWord === i ? null : i)} className="w-full text-left flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-bold text-white">{w.word}</span>
                                    <span className="text-xs text-[var(--color-text-muted)] ml-2 italic">{w.partOfSpeech}</span>
                                </div>
                                <ChevronDown size={14} className={`text-[var(--color-text-muted)] transition-transform ${expandedWord === i ? 'rotate-180' : ''}`} />
                            </button>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{w.definition}</p>
                            <AnimatePresence>
                                {expandedWord === i && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <div className="mt-2 space-y-1 text-[11px] text-[var(--color-text-muted)]">
                                            <p><strong>Mnemonic:</strong> {w.mnemonic}</p>
                                            {w.etymology && <p><strong>Etymology:</strong> {w.etymology}</p>}
                                            {w.examples?.map((ex, j) => <p key={j} className="italic">&ldquo;{ex}&rdquo;</p>)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                    <button
                        onClick={startQuiz}
                        className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-green)] text-white hover:brightness-110 transition-all"
                    >
                        Start Quick Quiz
                    </button>
                </div>
            )}
        </div>
    );
}
