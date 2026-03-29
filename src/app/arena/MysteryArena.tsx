'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, HelpCircle, CheckCircle, Coins, Eye, BookOpen, LayoutGrid } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { calculateReward, buildRewardContext } from '@/lib/rewardCalculator';
import { MYSTERY_BASE_XP, MYSTERY_BASE_GOLD, MYSTERY_HINT_COSTS, MYSTERY_HINT_REWARD_PENALTY } from '@/lib/arenaConstants';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useArenaKnowledgeSync } from '@/hooks/useArenaKnowledgeSync';
import type { ArenaDifficulty } from '@/store/types';
import ArenaRewardModal from './ArenaRewardModal';
import EvidenceBoard from './EvidenceBoard';

export default function MysteryArena() {
    const mystery = useGameStore((s) => s.arenaMystery);
    const stats = useGameStore((s) => s.arenaStats);
    const gold = useGameStore((s) => s.gold);
    const vocabWords = useGameStore((s) => s.vocabWords);
    const arenaLoading = useGameStore((s) => s.arenaLoading);
    const setArenaLoading = useGameStore((s) => s.setArenaLoading);
    const startMystery = useGameStore((s) => s.startMystery);
    const solveMysteryStep = useGameStore((s) => s.solveMysteryStep);
    const useMysteryHint = useGameStore((s) => s.useMysteryHint);
    const endMystery = useGameStore((s) => s.endMystery);
    const abandonMystery = useGameStore((s) => s.abandonMystery);
    const addXP = useGameStore((s) => s.addXP);
    const addGold = useGameStore((s) => s.addGold);
    const logActivity = useGameStore((s) => s.logActivity);
    const spendGold = useGameStore((s) => s.addGold); // negative amount
    const checkAchievements = useGameStore((s) => s.checkAchievements);

    const { playSuccess, playQuest, playVictory } = useSoundEffects();
    const { syncMysteryResults } = useArenaKnowledgeSync();

    const [difficulty, setDifficulty] = useState<ArenaDifficulty>('medium');
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [reward, setReward] = useState({ xp: 0, gold: 0 });
    const [validating, setValidating] = useState(false);
    const [viewMode, setViewMode] = useState<'standard' | 'board'>('standard');

    const handleGenerate = useCallback(async () => {
        setArenaLoading(true);
        try {
            const vocabList = vocabWords.slice(0, 10).map((w) => w.word);
            const res = await fetch('/api/arena/mystery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_mystery',
                    difficulty,
                    detectiveRank: stats.detectiveRank,
                    vocabWords: vocabList,
                }),
            });
            const data = await res.json();
            if (data.steps?.length) {
                startMystery(data.id, data.title, data.narrative, data.steps);
                setAnswer('');
                setFeedback(null);
                setViewMode('standard');
            }
        } catch {
            // API returns mock fallback
        } finally {
            setArenaLoading(false);
        }
    }, [difficulty, stats.detectiveRank, vocabWords, startMystery, setArenaLoading]);

    const handleSubmitAnswer = useCallback(async () => {
        if (!answer.trim() || validating) return;
        const step = mystery.steps[mystery.currentStep];
        if (!step) return;

        setValidating(true);
        try {
            const res = await fetch('/api/arena/mystery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'validate_answer',
                    riddle: step.riddle,
                    correctAnswer: step.answer,
                    playerAnswer: answer,
                }),
            });
            const data = await res.json();

            if (data.correct) {
                playSuccess();
                solveMysteryStep(mystery.currentStep);
                setFeedback({ text: data.feedback || 'Correct!', correct: true });

                // Check if mystery is solved after this step
                setTimeout(() => {
                    const s = useGameStore.getState();
                    if (s.arenaMystery.status === 'solved') {
                        handleMysteryComplete();
                    }
                }, 500);
            } else {
                setFeedback({ text: data.feedback || 'Not quite. Try again or use a hint.', correct: false });
            }
        } catch {
            setFeedback({ text: 'Validation failed. Try again.', correct: false });
        } finally {
            setAnswer('');
            setValidating(false);
        }
    }, [answer, mystery.steps, mystery.currentStep, solveMysteryStep, validating, playSuccess]);

    const handleUseHint = useCallback(() => {
        const step = mystery.steps[mystery.currentStep];
        if (!step || step.hintsUsed >= 3) return;

        const cost = MYSTERY_HINT_COSTS[step.hintsUsed];
        if (cost > 0 && gold < cost) return;

        if (cost > 0) spendGold(-cost);
        playQuest();
        useMysteryHint(mystery.currentStep);
    }, [mystery.steps, mystery.currentStep, gold, spendGold, useMysteryHint, playQuest]);

    const handleMysteryComplete = useCallback(() => {
        const state = useGameStore.getState();

        // Check achievements BEFORE endMystery resets session state
        checkAchievements();

        // Sync to knowledge graph before state reset
        syncMysteryResults(
            state.arenaMystery.title,
            state.arenaMystery.steps.filter((s) => s.solved),
        );

        const ctx = buildRewardContext(state);
        const hintPenalty = 1 - state.arenaMystery.hintsUsedTotal * MYSTERY_HINT_REWARD_PENALTY;
        const baseXp = Math.floor(MYSTERY_BASE_XP[difficulty] * Math.max(0.5, hintPenalty));
        const baseGold = Math.floor(MYSTERY_BASE_GOLD[difficulty] * Math.max(0.5, hintPenalty));

        const xpBreakdown = calculateReward(baseXp, 'xp', ctx);
        const goldBreakdown = calculateReward(baseGold, 'gold', ctx);

        addXP(xpBreakdown.final);
        addGold(goldBreakdown.final);
        logActivity('arena_mystery_solved', '🔍', `Solved "${state.arenaMystery.title}"`, `${state.arenaMystery.hintsUsedTotal} hints used`);

        playVictory();

        setReward({ xp: xpBreakdown.final, gold: goldBreakdown.final });
        setShowReward(true);
    }, [difficulty, addXP, addGold, logActivity, checkAchievements, syncMysteryResults, playVictory]);

    const handleRewardClose = () => {
        setShowReward(false);
        endMystery(true);
        // Check achievements AFTER endMystery for stats-based ones
        checkAchievements();
    };

    const handleAbandon = () => {
        abandonMystery();
        setFeedback(null);
        setAnswer('');
    };

    // Idle
    if (mystery.status === 'idle') {
        return (
            <div className="space-y-6 text-center">
                <Search className="mx-auto text-emerald-400" size={48} />
                <h2 className="text-2xl font-bold">Riddle & Mystery</h2>
                <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
                    Solve AI-generated mysteries with progressive riddles. Use hints wisely — they cost gold and reduce your reward!
                </p>

                <div className="flex items-center gap-2 justify-center text-sm text-[var(--color-text-secondary)]">
                    <BookOpen size={14} /> Detective Rank: <span className="font-bold text-emerald-400">{stats.detectiveRank}</span>
                    <span className="mx-2">|</span>
                    Solved: <span className="font-bold">{stats.mysteriesSolved}</span>
                </div>

                <div className="flex gap-3 justify-center flex-wrap">
                    {(['easy', 'medium', 'hard', 'legendary'] as ArenaDifficulty[]).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                                difficulty === d
                                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-text-secondary)]'
                            }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={arenaLoading}
                    className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                    {arenaLoading ? 'Generating Mystery...' : 'Begin Investigation'}
                </button>
            </div>
        );
    }

    const currentStep = mystery.steps[mystery.currentStep];

    // Solved
    if (mystery.status === 'solved') {
        return (
            <div className="space-y-4 text-center">
                <h2 className="text-2xl font-bold text-emerald-400">Mystery Solved!</h2>
                <p className="text-[var(--color-text-secondary)]">{mystery.title}</p>
                <ArenaRewardModal
                    open={showReward}
                    onClose={handleRewardClose}
                    title="Mystery Solved"
                    victory={true}
                    xpEarned={reward.xp}
                    goldEarned={reward.gold}
                    bonusInfo={mystery.hintsUsedTotal > 0 ? `${mystery.hintsUsedTotal} hints used (-${mystery.hintsUsedTotal * 10}% reward)` : 'No hints used — perfect investigation!'}
                />
            </div>
        );
    }

    if (!currentStep) return null;

    // Active investigation
    return (
        <div className="space-y-4">
            {/* View toggle + progress */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-1">
                    {mystery.steps.map((step, i) => (
                        <div
                            key={step.id}
                            className={`flex-1 h-2 rounded-full ${
                                step.solved ? 'bg-emerald-400' :
                                i === mystery.currentStep ? 'bg-emerald-400/40' :
                                'bg-[var(--color-bg-dark)]'
                            }`}
                        />
                    ))}
                </div>
                <button
                    onClick={() => setViewMode(viewMode === 'standard' ? 'board' : 'standard')}
                    className={`ml-3 p-1.5 rounded-md transition-colors ${
                        viewMode === 'board' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--color-text-muted)] hover:text-emerald-400'
                    }`}
                    title="Toggle Evidence Board"
                >
                    <LayoutGrid size={16} />
                </button>
            </div>

            {/* Evidence Board view OR Standard view */}
            {viewMode === 'board' ? (
                <EvidenceBoard
                    title={mystery.title}
                    narrative={mystery.narrative}
                    steps={mystery.steps}
                    currentStep={mystery.currentStep}
                />
            ) : (
                <>
                    {/* Title + narrative */}
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                        <h2 className="text-lg font-bold mb-1">{mystery.title}</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] italic">{mystery.narrative}</p>
                    </div>

                    {/* Clues from previous steps */}
                    {mystery.steps.filter((s) => s.solved && s.clueRevealed).map((s, i) => (
                        <div key={s.id} className="flex items-start gap-2 text-sm text-emerald-400/80 bg-emerald-900/10 rounded-lg p-2">
                            <CheckCircle size={14} className="mt-0.5 shrink-0" />
                            <span>Clue {i + 1}: {s.clueRevealed}</span>
                        </div>
                    ))}

                    {/* Current riddle */}
                    <div className="bg-[var(--color-bg-card)] border border-emerald-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <HelpCircle size={16} className="text-emerald-400" />
                            <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                Riddle {mystery.currentStep + 1} of {mystery.steps.length}
                            </span>
                        </div>
                        <p className="text-lg mb-4">{currentStep.riddle}</p>

                        {/* Hints */}
                        {currentStep.hintsUsed > 0 && (
                            <div className="space-y-1 mb-3">
                                {currentStep.hintsUsed >= 1 && (
                                    <p className="text-sm text-amber-400 italic"><Eye size={12} className="inline mr-1" /> {currentStep.hint1}</p>
                                )}
                                {currentStep.hintsUsed >= 2 && (
                                    <p className="text-sm text-amber-400 italic"><Eye size={12} className="inline mr-1" /> {currentStep.hint2}</p>
                                )}
                                {currentStep.hintsUsed >= 3 && (
                                    <p className="text-sm text-amber-400 italic"><Eye size={12} className="inline mr-1" /> {currentStep.hint3}</p>
                                )}
                            </div>
                        )}

                        {currentStep.hintsUsed < 3 && (
                            <button
                                onClick={handleUseHint}
                                disabled={MYSTERY_HINT_COSTS[currentStep.hintsUsed] > 0 && gold < MYSTERY_HINT_COSTS[currentStep.hintsUsed]}
                                className="text-xs text-amber-400 hover:text-amber-300 disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <Eye size={12} />
                                Use Hint
                                {MYSTERY_HINT_COSTS[currentStep.hintsUsed] > 0 && (
                                    <span className="flex items-center gap-0.5">
                                        (<Coins size={10} /> {MYSTERY_HINT_COSTS[currentStep.hintsUsed]} gold)
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-center text-sm font-semibold p-2 rounded-lg ${
                            feedback.correct ? 'text-emerald-400 bg-emerald-900/20' : 'text-red-400 bg-red-900/20'
                        }`}
                    >
                        {feedback.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Answer input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmitAnswer();
                        if (e.key === 'Escape') setAnswer('');
                    }}
                    placeholder="Type your answer..."
                    autoFocus
                    className="flex-1 px-4 py-2.5 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-emerald-400"
                />
                <button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || validating}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {validating ? '...' : 'Solve'}
                </button>
            </div>

            {/* Abandon */}
            <div className="text-center">
                <button
                    onClick={handleAbandon}
                    className="text-xs text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                >
                    Abandon Mystery
                </button>
            </div>
        </div>
    );
}
