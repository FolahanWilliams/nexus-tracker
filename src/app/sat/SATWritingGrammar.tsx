'use client';

import { useState } from 'react';
import { PenTool, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useAIFetch } from '@/hooks/useAIFetch';

interface WritingQ {
    sentence: string;
    options: string[];
    correctIndex: number;
    rule: string;
    explanation: string;
}

interface Props {
    onComplete: () => void;
}

export default function SATWritingGrammar({ onComplete }: Props) {
    const markSATBlockComplete = useGameStore((s) => s.markSATBlockComplete);
    const addSATWritingQ = useGameStore((s) => s.addSATWritingQ);
    const session = useGameStore((s) => s.satDailySession);

    const [questions, setQuestions] = useState<WritingQ[]>([]);
    const [questionIdx, setQuestionIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [correct, setCorrect] = useState(0);
    const [done, setDone] = useState(false);

    const { execute: generateWriting, isLoading } = useAIFetch<WritingQ[]>('/api/sat', {
        timeout: 30000,
        logTag: 'SAT-Writing',
    });

    const isComplete = session?.blockCComplete;

    const handleGenerate = async () => {
        const data = await generateWriting({ type: 'generate_writing' });
        if (data && Array.isArray(data) && data.length > 0) {
            setQuestions(data);
            setQuestionIdx(0);
            setCorrect(0);
            setDone(false);
        }
    };

    const handleAnswer = (idx: number) => {
        if (showResult) return;
        setSelectedAnswer(idx);
        setShowResult(true);
        const q = questions[questionIdx];
        if (idx === q.correctIndex) setCorrect(c => c + 1);
        addSATWritingQ({ sentence: q.sentence, options: q.options, correctIndex: q.correctIndex, rule: q.rule, explanation: q.explanation, userAnswer: idx });
    };

    const nextQuestion = () => {
        if (questionIdx < questions.length - 1) {
            setQuestionIdx(i => i + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            markSATBlockComplete('C');
            setDone(true);
            onComplete();
        }
    };

    if (isComplete || done) {
        return (
            <div className="flex items-center gap-2 text-[var(--color-green)] text-sm">
                <CheckCircle2 size={16} />
                <span className="font-bold">Writing & Grammar complete!{questions.length > 0 ? ` ${correct}/${questions.length} correct` : ''}</span>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="text-center space-y-3">
                <PenTool size={24} className="mx-auto text-[var(--color-orange)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">Practice grammar and writing revision questions.</p>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-orange)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                >
                    {isLoading ? <><Loader2 size={14} className="inline animate-spin mr-1" /> Generating...</> : 'Generate Questions'}
                </button>
            </div>
        );
    }

    const q = questions[questionIdx];

    return (
        <div className="space-y-4">
            <p className="text-[10px] text-[var(--color-text-muted)]">Question {questionIdx + 1} of {questions.length}</p>

            {/* Sentence */}
            <div className="p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{q.sentence}</p>
            </div>

            <p className="text-sm font-bold text-white">Choose the best revision:</p>

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
                    <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                        <p><strong className="text-[var(--color-orange)]">Rule:</strong> {q.rule}</p>
                        <p>{q.explanation}</p>
                    </div>
                    <button
                        onClick={nextQuestion}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-orange)] text-white hover:brightness-110 transition-all flex items-center gap-1"
                    >
                        {questionIdx < questions.length - 1 ? <>Next <ChevronRight size={14} /></> : 'Complete Block'}
                    </button>
                </motion.div>
            )}
        </div>
    );
}
