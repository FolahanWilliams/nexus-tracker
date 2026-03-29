'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Flame, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { calculateReward, buildRewardContext } from '@/lib/rewardCalculator';
import { GAUNTLET_XP_PER_POINT, GAUNTLET_GOLD_PER_POINT, GAUNTLET_COMBO_MULTIPLIERS } from '@/lib/arenaConstants';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useArenaKnowledgeSync } from '@/hooks/useArenaKnowledgeSync';
import type { ArenaDifficulty } from '@/store/types';
import ArenaRewardModal from './ArenaRewardModal';

const PUZZLE_TYPE_LABELS: Record<string, string> = {
    anagram: 'Anagram',
    word_chain: 'Word Chain',
    crossword_clue: 'Crossword Clue',
    cryptogram: 'Cryptogram',
};

const PUZZLE_TYPE_ICONS: Record<string, string> = {
    anagram: '🔀', word_chain: '🔗', crossword_clue: '📝', cryptogram: '🔐',
};

export default function GauntletArena() {
    const gauntlet = useGameStore((s) => s.arenaGauntlet);
    const arenaLoading = useGameStore((s) => s.arenaLoading);
    const setArenaLoading = useGameStore((s) => s.setArenaLoading);
    const startGauntlet = useGameStore((s) => s.startGauntlet);
    const answerGauntletPuzzle = useGameStore((s) => s.answerGauntletPuzzle);
    const tickGauntletTimer = useGameStore((s) => s.tickGauntletTimer);
    const endGauntlet = useGameStore((s) => s.endGauntlet);
    const addXP = useGameStore((s) => s.addXP);
    const addGold = useGameStore((s) => s.addGold);
    const logActivity = useGameStore((s) => s.logActivity);
    const vocabWords = useGameStore((s) => s.vocabWords);
    const checkAchievements = useGameStore((s) => s.checkAchievements);

    const { playSuccess, playError, playCoin, playVictory } = useSoundEffects();
    const { syncGauntletResults } = useArenaKnowledgeSync();

    const [difficulty, setDifficulty] = useState<ArenaDifficulty>('medium');
    const [answer, setAnswer] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [reward, setReward] = useState({ xp: 0, gold: 0 });
    const [validating, setValidating] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const correctAnswersRef = useRef<string[]>([]);

    // Timer tick
    useEffect(() => {
        if (gauntlet.status === 'active') {
            timerRef.current = setInterval(() => {
                tickGauntletTimer(100);
            }, 100);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gauntlet.status, tickGauntletTimer]);

    // Handle gauntlet end
    useEffect(() => {
        if (gauntlet.status === 'finished' && gauntlet.score > 0) {
            if (timerRef.current) clearInterval(timerRef.current);

            // Check achievements BEFORE endGauntlet resets session state
            checkAchievements();

            // Sync to knowledge graph
            if (correctAnswersRef.current.length > 0) {
                syncGauntletResults(correctAnswersRef.current);
            }

            const state = useGameStore.getState();
            const ctx = buildRewardContext(state);
            const baseXp = Math.floor(gauntlet.score * GAUNTLET_XP_PER_POINT);
            const baseGold = Math.floor(gauntlet.score * GAUNTLET_GOLD_PER_POINT);
            const xpBreakdown = calculateReward(baseXp, 'xp', ctx);
            const goldBreakdown = calculateReward(baseGold, 'gold', ctx);

            addXP(xpBreakdown.final);
            addGold(goldBreakdown.final);
            logActivity('arena_gauntlet_complete', '⚡', `Completed a ${difficulty} Gauntlet`, `Score: ${gauntlet.score} | Combo: ${gauntlet.maxCombo}x`);

            playVictory();

            setReward({ xp: xpBreakdown.final, gold: goldBreakdown.final });
            setShowReward(true);
        }
    }, [gauntlet.status]);

    const handleStart = useCallback(async () => {
        setArenaLoading(true);
        correctAnswersRef.current = [];
        try {
            const vocabList = vocabWords.slice(0, 15).map((w) => w.word);
            const res = await fetch('/api/arena/gauntlet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_puzzles',
                    difficulty,
                    count: 12,
                    vocabWords: vocabList,
                }),
            });
            const data = await res.json();
            if (data.puzzles?.length) {
                startGauntlet(data.puzzles);
                setAnswer('');
                setShowHint(false);
                setLastResult(null);
            }
        } catch {
            // fallback handled by API
        } finally {
            setArenaLoading(false);
        }
    }, [difficulty, vocabWords, startGauntlet, setArenaLoading]);

    const handleSubmit = useCallback(async () => {
        if (!answer.trim() || validating) return;
        const puzzle = gauntlet.puzzles[gauntlet.currentPuzzleIndex];
        if (!puzzle) return;

        setValidating(true);
        try {
            const res = await fetch('/api/arena/gauntlet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'validate_answer',
                    correctAnswer: puzzle.answer,
                    playerAnswer: answer,
                    puzzlePrompt: puzzle.prompt,
                }),
            });
            const data = await res.json();
            const isVocabWord = vocabWords.some(
                (w) => w.word.toUpperCase() === answer.toUpperCase(),
            );

            answerGauntletPuzzle(data.correct, isVocabWord);

            if (data.correct) {
                playSuccess();
                correctAnswersRef.current.push(answer);
                // Play coin sound at combo milestones
                const newCombo = gauntlet.combo + 1;
                if (newCombo === 3 || newCombo === 5) playCoin();
            } else {
                playError();
            }

            setLastResult(data.correct ? 'correct' : 'wrong');
            setTimeout(() => setLastResult(null), 800);
        } catch {
            answerGauntletPuzzle(false, false);
            playError();
            setLastResult('wrong');
            setTimeout(() => setLastResult(null), 800);
        } finally {
            setAnswer('');
            setShowHint(false);
            setValidating(false);
        }
    }, [answer, gauntlet.puzzles, gauntlet.currentPuzzleIndex, gauntlet.combo, vocabWords, answerGauntletPuzzle, validating, playSuccess, playError, playCoin]);

    const handleRewardClose = () => {
        setShowReward(false);
        endGauntlet();
        // Check achievements AFTER endGauntlet for stats-based ones
        checkAchievements();
    };

    // Idle
    if (gauntlet.status === 'idle') {
        return (
            <div className="space-y-6 text-center">
                <Zap className="mx-auto text-amber-400" size={48} />
                <h2 className="text-2xl font-bold">Word Puzzle Gauntlet</h2>
                <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
                    Race through AI-generated puzzles against the clock. Build combos for higher scores!
                </p>

                <div className="flex gap-3 justify-center flex-wrap">
                    {(['easy', 'medium', 'hard', 'legendary'] as ArenaDifficulty[]).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                                difficulty === d
                                    ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-text-secondary)]'
                            }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleStart}
                    disabled={arenaLoading}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                    {arenaLoading ? 'Generating Puzzles...' : 'Start Gauntlet'}
                </button>
            </div>
        );
    }

    const currentPuzzle = gauntlet.puzzles[gauntlet.currentPuzzleIndex];
    const timeSeconds = Math.ceil(gauntlet.timeRemainingMs / 1000);
    const timePercent = (gauntlet.timeRemainingMs / 180_000) * 100;
    const comboIdx = Math.min(gauntlet.combo, GAUNTLET_COMBO_MULTIPLIERS.length - 1);
    const currentMultiplier = gauntlet.combo > 0 ? GAUNTLET_COMBO_MULTIPLIERS[comboIdx] : 1;

    // Finished but no reward shown yet
    if (gauntlet.status === 'finished' || !currentPuzzle) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Gauntlet Complete!</h2>
                <p className="text-4xl font-bold text-amber-400">{gauntlet.score} pts</p>
                <p className="text-[var(--color-text-secondary)]">
                    {gauntlet.correctCount} correct | {gauntlet.incorrectCount} wrong | Max combo: {gauntlet.maxCombo}x
                </p>
                <ArenaRewardModal
                    open={showReward}
                    onClose={handleRewardClose}
                    title="Gauntlet Complete"
                    victory={true}
                    xpEarned={reward.xp}
                    goldEarned={reward.gold}
                    bonusInfo={`Max Combo: ${gauntlet.maxCombo}x | Vocab Bonuses: ${gauntlet.vocabBonuses}`}
                />
            </div>
        );
    }

    // Active
    return (
        <div className="space-y-4">
            {/* Timer + Score bar */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Clock size={16} className={timeSeconds <= 10 ? 'text-red-400 animate-pulse' : 'text-[var(--color-text-secondary)]'} />
                    <span className={`font-mono font-bold ${timeSeconds <= 10 ? 'text-red-400' : ''}`}>
                        {Math.floor(timeSeconds / 60)}:{String(timeSeconds % 60).padStart(2, '0')}
                    </span>
                </div>
                <span className="font-bold text-lg">{gauntlet.score} pts</span>
            </div>

            {/* Timer bar */}
            <div className="w-full h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: timePercent > 30 ? 'var(--color-green)' : timePercent > 10 ? '#eab308' : '#ef4444' }}
                    animate={{ width: `${Math.min(timePercent, 100)}%` }}
                    transition={{ duration: 0.1 }}
                />
            </div>

            {/* Combo indicator */}
            <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1">
                    {gauntlet.combo > 0 && <Flame size={14} className="text-orange-400" />}
                    Combo: <span className={`font-bold ${gauntlet.combo > 0 ? 'text-orange-400' : ''}`}>
                        {gauntlet.combo > 0 ? `${currentMultiplier}x` : '—'}
                    </span>
                </span>
                <span className="text-[var(--color-text-muted)]">
                    Puzzle {gauntlet.currentPuzzleIndex + 1} / {gauntlet.puzzles.length}
                </span>
            </div>

            {/* Result flash */}
            <AnimatePresence>
                {lastResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`text-center py-2 rounded-lg font-bold ${
                            lastResult === 'correct' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                        }`}
                    >
                        {lastResult === 'correct' ? <><CheckCircle size={16} className="inline mr-1" /> Correct!</> : <><XCircle size={16} className="inline mr-1" /> Wrong</>}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Puzzle card */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{PUZZLE_TYPE_ICONS[currentPuzzle.type] || '❓'}</span>
                    <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                        {PUZZLE_TYPE_LABELS[currentPuzzle.type] || currentPuzzle.type}
                    </span>
                </div>
                <p className="text-lg mb-4">{currentPuzzle.prompt}</p>

                {showHint && currentPuzzle.hint && (
                    <p className="text-sm text-amber-400 mb-3 italic">Hint: {currentPuzzle.hint}</p>
                )}

                {!showHint && currentPuzzle.hint && (
                    <button
                        onClick={() => setShowHint(true)}
                        className="text-xs text-[var(--color-text-muted)] hover:text-amber-400 mb-3"
                    >
                        Show hint
                    </button>
                )}
            </div>

            {/* Answer input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit();
                        if (e.key === 'Escape') setAnswer('');
                    }}
                    placeholder="Type your answer..."
                    autoFocus
                    className="flex-1 px-4 py-2.5 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-amber-400"
                />
                <button
                    onClick={handleSubmit}
                    disabled={!answer.trim() || validating}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {validating ? '...' : 'Submit'}
                </button>
            </div>
        </div>
    );
}
