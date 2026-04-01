'use client';

import { useState } from 'react';
import { Calculator, Loader2, CheckCircle2, XCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useAIFetch } from '@/hooks/useAIFetch';

interface MathProblem {
    question: string;
    type: string;
    difficulty: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    steps: string[];
}

interface Props {
    onComplete: () => void;
}

const MATH_TYPES = [
    { id: 'algebra', label: 'Algebra', color: 'var(--color-blue)' },
    { id: 'advanced-math', label: 'Advanced Math', color: 'var(--color-purple)' },
    { id: 'problem-solving', label: 'Problem Solving', color: 'var(--color-green)' },
    { id: 'geometry', label: 'Geometry', color: 'var(--color-orange)' },
];

export default function SATMathPractice({ onComplete }: Props) {
    const markSATBlockComplete = useGameStore((s) => s.markSATBlockComplete);
    const addSATMathProblem = useGameStore((s) => s.addSATMathProblem);
    const session = useGameStore((s) => s.satDailySession);

    const [mathType, setMathType] = useState('algebra');
    const [problems, setProblems] = useState<MathProblem[]>([]);
    const [problemIdx, setProblemIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [showSteps, setShowSteps] = useState(false);
    const [correct, setCorrect] = useState(0);
    const [done, setDone] = useState(false);

    const { execute: generateMath, isLoading } = useAIFetch<MathProblem[]>('/api/sat', {
        timeout: 30000,
        logTag: 'SAT-Math',
    });

    const isComplete = session?.blockDComplete;

    const handleGenerate = async () => {
        const data = await generateMath({ type: 'generate_math', mathType, difficulty: 'medium' });
        if (data && Array.isArray(data) && data.length > 0) {
            setProblems(data);
            setProblemIdx(0);
            setCorrect(0);
            setDone(false);
        }
    };

    const handleAnswer = (answer: string) => {
        if (showResult) return;
        setSelectedAnswer(answer);
        setShowResult(true);
        const p = problems[problemIdx];
        if (answer === p.correctAnswer) setCorrect(c => c + 1);
        addSATMathProblem({
            question: p.question,
            type: p.type as 'algebra' | 'advanced-math' | 'problem-solving' | 'geometry',
            difficulty: p.difficulty as 'easy' | 'medium' | 'hard',
            options: p.options,
            correctAnswer: p.correctAnswer,
            explanation: p.explanation,
            steps: p.steps,
            userAnswer: answer,
        });
    };

    const nextProblem = () => {
        if (problemIdx < problems.length - 1) {
            setProblemIdx(i => i + 1);
            setSelectedAnswer(null);
            setShowResult(false);
            setShowSteps(false);
        } else {
            markSATBlockComplete('D');
            setDone(true);
            onComplete();
        }
    };

    if (isComplete || done) {
        return (
            <div className="flex items-center gap-2 text-[var(--color-green)] text-sm">
                <CheckCircle2 size={16} />
                <span className="font-bold">Math practice complete!{problems.length > 0 ? ` ${correct}/${problems.length} correct` : ''}</span>
            </div>
        );
    }

    if (problems.length === 0) {
        return (
            <div className="space-y-4">
                <div className="text-center space-y-3">
                    <Calculator size={24} className="mx-auto text-[var(--color-cyan)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Practice SAT math problems.</p>
                </div>

                {/* Math type selector */}
                <div className="flex flex-wrap gap-1.5">
                    {MATH_TYPES.map(mt => (
                        <button
                            key={mt.id}
                            onClick={() => setMathType(mt.id)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium border transition-all"
                            style={{
                                color: mathType === mt.id ? mt.color : 'var(--color-text-secondary)',
                                borderColor: mathType === mt.id ? mt.color : 'var(--color-border)',
                                background: mathType === mt.id ? `color-mix(in srgb, ${mt.color} 12%, transparent)` : 'transparent',
                            }}
                        >
                            {mt.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-cyan)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                >
                    {isLoading ? <><Loader2 size={14} className="inline animate-spin mr-1" /> Generating...</> : 'Generate Problems'}
                </button>
            </div>
        );
    }

    const p = problems[problemIdx];
    const typeColor = MATH_TYPES.find(mt => mt.id === p.type)?.color || 'var(--color-cyan)';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--color-text-muted)]">Problem {problemIdx + 1} of {problems.length}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                    background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                    color: typeColor,
                }}>
                    {p.type}
                </span>
            </div>

            {/* Problem */}
            <div className="p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{p.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2">
                {p.options.map((opt, i) => {
                    let style = 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]';
                    if (showResult) {
                        if (opt === p.correctAnswer) style = 'border-[var(--color-green)] bg-[color-mix(in_srgb,var(--color-green)_10%,transparent)] text-[var(--color-green)]';
                        else if (opt === selectedAnswer) style = 'border-[var(--color-red)] bg-[color-mix(in_srgb,var(--color-red)_10%,transparent)] text-[var(--color-red)]';
                    }
                    return (
                        <button
                            key={i}
                            onClick={() => handleAnswer(opt)}
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
                    {selectedAnswer === p.correctAnswer ? (
                        <p className="text-sm text-[var(--color-green)] font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Correct!</p>
                    ) : (
                        <p className="text-sm text-[var(--color-red)] font-bold flex items-center gap-1"><XCircle size={14} /> Incorrect — Answer: {p.correctAnswer}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)]">{p.explanation}</p>

                    {/* Step-by-step solution */}
                    <button
                        onClick={() => setShowSteps(!showSteps)}
                        className="text-[11px] text-[var(--color-cyan)] hover:brightness-110 flex items-center gap-1"
                    >
                        <ChevronDown size={12} className={`transition-transform ${showSteps ? 'rotate-180' : ''}`} />
                        {showSteps ? 'Hide' : 'Show'} step-by-step solution
                    </button>
                    <AnimatePresence>
                        {showSteps && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <ol className="list-decimal list-inside text-xs text-[var(--color-text-secondary)] space-y-1 pl-2">
                                    {p.steps.map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={nextProblem}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-cyan)] text-white hover:brightness-110 transition-all flex items-center gap-1"
                    >
                        {problemIdx < problems.length - 1 ? <>Next <ChevronRight size={14} /></> : 'Complete Block'}
                    </button>
                </motion.div>
            )}
        </div>
    );
}
