'use client';

import { useState } from 'react';
import { BookOpen, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useAIFetch } from '@/hooks/useAIFetch';

interface PassageData {
    passage: string;
    questions: { question: string; options: string[]; correctIndex: number; explanation: string }[];
    topic: string;
    difficulty: string;
}

interface Props {
    onComplete: () => void;
}

const TOPICS = ['science', 'history', 'literature', 'social science'];

export default function SATReadingPassage({ onComplete }: Props) {
    const markSATBlockComplete = useGameStore((s) => s.markSATBlockComplete);
    const addSATPassage = useGameStore((s) => s.addSATPassage);
    const session = useGameStore((s) => s.satDailySession);

    const [passage, setPassage] = useState<PassageData | null>(null);
    const [questionIdx, setQuestionIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<number[]>([]);
    const [done, setDone] = useState(false);

    const { execute: generatePassage, isLoading } = useAIFetch<PassageData>('/api/sat', {
        timeout: 45000,
        logTag: 'SAT-Reading',
    });

    const isComplete = session?.blockBComplete;

    const handleGenerate = async () => {
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const data = await generatePassage({ type: 'generate_passage', topic, difficulty: 'medium' });
        if (data?.passage && data?.questions) {
            setPassage(data);
            setQuestionIdx(0);
            setAnswers([]);
            setDone(false);
        }
    };

    const handleAnswer = (idx: number) => {
        if (showResult) return;
        setSelectedAnswer(idx);
        setShowResult(true);
        setAnswers(prev => [...prev, idx]);
    };

    const nextQuestion = () => {
        if (!passage) return;
        if (questionIdx < passage.questions.length - 1) {
            setQuestionIdx(i => i + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            const correct = answers.filter((a, i) => a === passage.questions[i]?.correctIndex).length;
            const score = Math.round((correct / passage.questions.length) * 100);
            addSATPassage({ passage: passage.passage, questions: passage.questions, topic: passage.topic, difficulty: passage.difficulty as 'easy' | 'medium' | 'hard', userAnswers: answers, score });
            markSATBlockComplete('B');
            setDone(true);
            onComplete();
        }
    };

    if (isComplete || done) {
        const correct = passage ? answers.filter((a, i) => a === passage.questions[i]?.correctIndex).length : 0;
        return (
            <div className="flex items-center gap-2 text-[var(--color-green)] text-sm">
                <CheckCircle2 size={16} />
                <span className="font-bold">Reading comprehension complete!{passage ? ` ${correct}/${passage.questions.length} correct` : ''}</span>
            </div>
        );
    }

    if (!passage) {
        return (
            <div className="text-center space-y-3">
                <BookOpen size={24} className="mx-auto text-[var(--color-purple)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">Read a passage and answer comprehension questions.</p>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-purple)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                >
                    {isLoading ? <><Loader2 size={14} className="inline animate-spin mr-1" /> Generating passage...</> : 'Generate Passage'}
                </button>
            </div>
        );
    }

    const q = passage.questions[questionIdx];

    return (
        <div className="space-y-4">
            {/* Passage */}
            <div className="p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] max-h-48 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-purple)] font-bold mb-2">
                    {passage.topic} — Passage
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{passage.passage}</p>
            </div>

            {/* Question */}
            <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-text-muted)]">Question {questionIdx + 1} of {passage.questions.length}</p>
                <p className="text-sm font-bold text-white">{q.question}</p>

                <div className="space-y-2">
                    {q.options.map((opt, i) => {
                        let style = 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]';
                        if (showResult) {
                            if (i === q.correctIndex) style = 'border-[var(--color-green)] bg-[color-mix(in_srgb,var(--color-green)_10%,transparent)] text-[var(--color-green)]';
                            else if (i === selectedAnswer) style = 'border-[var(--color-red)] bg-[color-mix(in_srgb,var(--color-red)_10%,transparent)] text-[var(--color-red)]';
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
                        {selectedAnswer === q.correctIndex ? (
                            <p className="text-sm text-[var(--color-green)] font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Correct!</p>
                        ) : (
                            <p className="text-sm text-[var(--color-red)] font-bold flex items-center gap-1"><XCircle size={14} /> Incorrect</p>
                        )}
                        <p className="text-xs text-[var(--color-text-muted)]">{q.explanation}</p>
                        <button
                            onClick={nextQuestion}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-purple)] text-white hover:brightness-110 transition-all flex items-center gap-1"
                        >
                            {questionIdx < passage.questions.length - 1 ? <>Next <ChevronRight size={14} /></> : 'Complete Block'}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
