'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Loader2, CheckCircle2, XCircle, Clock, ChevronRight, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useAIFetch } from '@/hooks/useAIFetch';

interface TestQuestion {
    id: string;
    section: 'reading-writing' | 'math';
    type: string;
    question: string;
    passage?: string;
    sentence?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface TestData {
    section: string;
    questions: TestQuestion[];
    timeLimit: number;
}

type Section = 'full' | 'reading-writing' | 'math';

const SECTIONS: { id: Section; label: string; color: string }[] = [
    { id: 'full', label: 'Full Test', color: 'var(--color-blue)' },
    { id: 'reading-writing', label: 'R&W Only', color: 'var(--color-purple)' },
    { id: 'math', label: 'Math Only', color: 'var(--color-cyan)' },
];

export default function SATPracticeTest() {
    const recordSATTestResult = useGameStore((s) => s.recordSATTestResult);

    const [section, setSection] = useState<Section>('full');
    const [test, setTest] = useState<TestData | null>(null);
    const [questionIdx, setQuestionIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [done, setDone] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { execute: generateTest, isLoading } = useAIFetch<TestData>('/api/sat', {
        timeout: 60000,
        logTag: 'SAT-Test',
    });

    // Timer
    useEffect(() => {
        if (test && !done && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) {
                        finishTest();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [test, done]);

    const handleGenerate = async () => {
        const data = await generateTest({ type: 'generate_practice_test', section });
        if (data?.questions) {
            setTest(data);
            setQuestionIdx(0);
            setAnswers(new Array(data.questions.length).fill(null));
            setDone(false);
            setTimeLeft(data.timeLimit || 900);
            setStartTime(Date.now());
            setSelectedAnswer(null);
            setShowResult(false);
        }
    };

    const handleAnswer = (idx: number) => {
        if (showResult) return;
        setSelectedAnswer(idx);
        setShowResult(true);
        setAnswers(prev => { const next = [...prev]; next[questionIdx] = idx; return next; });
    };

    const nextQuestion = () => {
        if (!test) return;
        if (questionIdx < test.questions.length - 1) {
            setQuestionIdx(i => i + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            finishTest();
        }
    };

    const finishTest = useCallback(() => {
        if (!test || done) return;
        if (timerRef.current) clearInterval(timerRef.current);
        setDone(true);

        const correctCount = answers.filter((a, i) => a === test.questions[i]?.correctIndex).length;
        const totalQ = test.questions.length;
        // Scale score to 200-800 range per section
        const rawPct = correctCount / totalQ;
        const scaledScore = Math.round(200 + rawPct * 600);
        const timeSpent = Math.round((Date.now() - startTime) / 1000);

        // Identify weak areas
        const typeWrong: Record<string, number> = {};
        answers.forEach((a, i) => {
            if (a !== test.questions[i]?.correctIndex) {
                const t = test.questions[i].type;
                typeWrong[t] = (typeWrong[t] || 0) + 1;
            }
        });
        const weakAreas = Object.entries(typeWrong).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

        recordSATTestResult({
            date: new Date().toISOString().split('T')[0],
            section: section === 'full' ? 'full' : section,
            score: scaledScore,
            totalQuestions: totalQ,
            correctAnswers: correctCount,
            timeSpentSeconds: timeSpent,
            weakAreas,
        });
    }, [test, done, answers, startTime, section, recordSATTestResult]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // Results screen
    if (done && test) {
        const correctCount = answers.filter((a, i) => a === test.questions[i]?.correctIndex).length;
        const totalQ = test.questions.length;
        const pct = Math.round((correctCount / totalQ) * 100);
        const scaledScore = Math.round(200 + (correctCount / totalQ) * 600);

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-center space-y-2">
                    <Trophy size={32} className="mx-auto text-[var(--color-yellow)]" />
                    <h2 className="text-lg font-bold">Practice Test Complete!</h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
                        <p className="text-2xl font-bold text-[var(--color-blue)]">{scaledScore}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Scaled Score</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
                        <p className="text-2xl font-bold text-[var(--color-green)]">{pct}%</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Accuracy</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center">
                        <p className="text-2xl font-bold text-white">{correctCount}/{totalQ}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Correct</p>
                    </div>
                </div>

                {/* Review answers */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)]">Answer Review</p>
                    {test.questions.map((q, i) => {
                        const userAnswer = answers[i];
                        const isCorrect = userAnswer === q.correctIndex;
                        return (
                            <div key={i} className={`p-3 rounded-lg border text-xs ${
                                isCorrect ? 'border-[var(--color-green)] bg-[color-mix(in_srgb,var(--color-green)_5%,transparent)]' : 'border-[var(--color-red)] bg-[color-mix(in_srgb,var(--color-red)_5%,transparent)]'
                            }`}>
                                <div className="flex items-start gap-2">
                                    {isCorrect ? <CheckCircle2 size={14} className="text-[var(--color-green)] shrink-0 mt-0.5" /> : <XCircle size={14} className="text-[var(--color-red)] shrink-0 mt-0.5" />}
                                    <div>
                                        <p className="text-[var(--color-text-secondary)]">{q.question.slice(0, 80)}...</p>
                                        {!isCorrect && <p className="text-[var(--color-text-muted)] mt-1">{q.explanation}</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={() => { setTest(null); setDone(false); }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all"
                >
                    Take Another Test
                </button>
            </motion.div>
        );
    }

    // Active test
    if (test) {
        const q = test.questions[questionIdx];
        return (
            <div className="space-y-4">
                {/* Timer + Progress */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Question {questionIdx + 1} of {test.questions.length}
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{
                            background: q.section === 'math' ? 'color-mix(in srgb, var(--color-cyan) 15%, transparent)' : 'color-mix(in srgb, var(--color-purple) 15%, transparent)',
                            color: q.section === 'math' ? 'var(--color-cyan)' : 'var(--color-purple)',
                        }}>
                            {q.section === 'math' ? 'Math' : 'R&W'}
                        </span>
                    </p>
                    <span className={`text-xs font-mono flex items-center gap-1 ${timeLeft < 60 ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]'}`}>
                        <Clock size={12} /> {formatTime(timeLeft)}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 rounded-full bg-[var(--color-bg-hover)]">
                    <div className="h-full rounded-full bg-[var(--color-blue)] transition-all" style={{ width: `${((questionIdx + 1) / test.questions.length) * 100}%` }} />
                </div>

                {/* Passage/Sentence context */}
                {q.passage && (
                    <div className="p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] max-h-32 overflow-y-auto">
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{q.passage}</p>
                    </div>
                )}
                {q.sentence && (
                    <div className="p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-secondary)]">{q.sentence}</p>
                    </div>
                )}

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
                        <p className="text-xs text-[var(--color-text-muted)]">{q.explanation}</p>
                        <button
                            onClick={nextQuestion}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all flex items-center gap-1"
                        >
                            {questionIdx < test.questions.length - 1 ? <>Next <ChevronRight size={14} /></> : 'Finish Test'}
                        </button>
                    </motion.div>
                )}
            </div>
        );
    }

    // Idle — test selector
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <FileText size={28} className="mx-auto text-[var(--color-blue)]" />
                <h2 className="text-sm font-bold">SAT Practice Test</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Timed mini-test with mixed questions. Results contribute to your projected SAT score.</p>
            </div>

            {/* Section selector */}
            <div className="flex gap-2">
                {SECTIONS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{
                            color: section === s.id ? s.color : 'var(--color-text-secondary)',
                            borderColor: section === s.id ? s.color : 'var(--color-border)',
                            background: section === s.id ? `color-mix(in srgb, ${s.color} 12%, transparent)` : 'transparent',
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white hover:brightness-110 transition-all disabled:opacity-40"
            >
                {isLoading ? <><Loader2 size={14} className="inline animate-spin mr-1" /> Generating test...</> : 'Start Practice Test'}
            </button>
        </div>
    );
}
