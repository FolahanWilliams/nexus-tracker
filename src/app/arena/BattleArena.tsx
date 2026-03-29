'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, RefreshCw, Sparkles, Heart, Shield, Trophy, Timer } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { calculateReward, buildRewardContext } from '@/lib/rewardCalculator';
import { calculateWordDamage, VOCAB_STRIKE_MULTIPLIER, BATTLE_CONFIG, ARENA_LOOT_CHANCE } from '@/lib/arenaConstants';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useArenaKnowledgeSync } from '@/hooks/useArenaKnowledgeSync';
import type { ArenaDifficulty } from '@/store/types';
import LetterTile from './LetterTile';
import EnemyCard from './EnemyCard';
import ArenaRewardModal from './ArenaRewardModal';

const DIFFICULTIES: ArenaDifficulty[] = ['easy', 'medium', 'hard', 'legendary'];

export default function BattleArena() {
    const battle = useGameStore((s) => s.arenaBattle);
    const stats = useGameStore((s) => s.arenaStats);
    const vocabWords = useGameStore((s) => s.vocabWords);
    const startBattle = useGameStore((s) => s.startBattle);
    const submitBattleWord = useGameStore((s) => s.submitBattleWord);
    const enemyAttack = useGameStore((s) => s.enemyAttack);
    const endBattle = useGameStore((s) => s.endBattle);
    const refreshLetterPool = useGameStore((s) => s.refreshLetterPool);
    const setArenaLoading = useGameStore((s) => s.setArenaLoading);
    const arenaLoading = useGameStore((s) => s.arenaLoading);
    const addXP = useGameStore((s) => s.addXP);
    const addGold = useGameStore((s) => s.addGold);
    const addItem = useGameStore((s) => s.addItem);
    const logActivity = useGameStore((s) => s.logActivity);
    const reviewVocabWord = useGameStore((s) => s.reviewVocabWord);
    const checkAchievements = useGameStore((s) => s.checkAchievements);

    const { playHit, playBoss, playVictory, playError, playCoin } = useSoundEffects();
    const { syncBattleResults } = useArenaKnowledgeSync();

    const [selectedLetters, setSelectedLetters] = useState<number[]>([]);
    const [currentWord, setCurrentWord] = useState('');
    const [difficulty, setDifficulty] = useState<ArenaDifficulty>('medium');
    const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [damageFloat, setDamageFloat] = useState<{ damage: number; vocab: boolean } | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [reward, setReward] = useState({ xp: 0, gold: 0, bonus: '', item: '' });
    const [validating, setValidating] = useState(false);
    const [turnTimerMs, setTurnTimerMs] = useState<number | null>(null);

    // ── Turn timer for time_pressure ability ──
    useEffect(() => {
        if (!battle.turnTimerDeadlineMs || battle.status !== 'active') {
            setTurnTimerMs(null);
            return;
        }

        const tick = () => {
            const remaining = battle.turnTimerDeadlineMs! - Date.now();
            if (remaining <= 0) {
                setTurnTimerMs(0);
                // Auto-forfeit: enemy attacks again
                enemyAttack();
                setFeedback({ text: 'Time ran out! The enemy attacks again!', type: 'error' });
            } else {
                setTurnTimerMs(remaining);
            }
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [battle.turnTimerDeadlineMs, battle.status, enemyAttack]);

    // ── Display ability message after enemy attack ──
    useEffect(() => {
        if (battle.lastAbilityMessage) {
            setFeedback({ text: battle.lastAbilityMessage, type: 'info' });
        }
    }, [battle.lastAbilityMessage]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        if (battle.status !== 'active') return;

        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            // Number keys 1-9, 0 → toggle letter at index 0-9
            if (e.key >= '1' && e.key <= '9') {
                const idx = parseInt(e.key) - 1;
                if (idx < battle.letterPool.length) {
                    e.preventDefault();
                    toggleLetterByIndex(idx);
                }
                return;
            }
            if (e.key === '0') {
                if (9 < battle.letterPool.length) {
                    e.preventDefault();
                    toggleLetterByIndex(9);
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmitWord();
                return;
            }
            if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                setSelectedLetters([]);
                setCurrentWord('');
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [battle.status, battle.letterPool.length]);

    const toggleLetterByIndex = (index: number) => {
        setSelectedLetters((prev) => {
            const pool = useGameStore.getState().arenaBattle.letterPool;
            let newSelected: number[];
            if (prev.includes(index)) {
                newSelected = prev.filter((i) => i !== index);
            } else {
                newSelected = [...prev, index];
            }
            setCurrentWord(newSelected.map((i) => pool[i]).join(''));
            return newSelected;
        });
    };

    const handleStartBattle = useCallback(async () => {
        setArenaLoading(true);
        try {
            const [enemyRes, lettersRes] = await Promise.all([
                fetch('/api/arena/battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'generate_enemy',
                        difficulty,
                        level: useGameStore.getState().level,
                        winStreak: stats.battleWinStreak,
                    }),
                }),
                fetch('/api/arena/battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'generate_letters', difficulty }),
                }),
            ]);

            const enemyData = await enemyRes.json();
            const lettersData = await lettersRes.json();

            if (enemyData.enemy && lettersData.letters) {
                startBattle(enemyData.enemy, lettersData.letters);
                setSelectedLetters([]);
                setCurrentWord('');
                setFeedback(null);
            }
        } catch {
            setFeedback({ text: 'Failed to start battle. Try again.', type: 'error' });
        } finally {
            setArenaLoading(false);
        }
    }, [difficulty, stats.battleWinStreak, startBattle, setArenaLoading]);

    const toggleLetter = (index: number) => {
        toggleLetterByIndex(index);
    };

    const handleSubmitWord = useCallback(async () => {
        const word = useGameStore.getState().arenaBattle.letterPool.length > 0 ? currentWord : currentWord;
        if (word.length < 2 || validating) return;
        setValidating(true);

        try {
            const pool = useGameStore.getState().arenaBattle.letterPool;
            const res = await fetch('/api/arena/battle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'validate_word',
                    word,
                    letters: pool,
                }),
            });
            const data = await res.json();

            if (data.valid) {
                let damage = calculateWordDamage(word);
                const vocabMatch = vocabWords.find(
                    (w) => w.word.toUpperCase() === word.toUpperCase(),
                );
                const isVocabStrike = !!vocabMatch;
                if (isVocabStrike) {
                    damage = Math.floor(damage * VOCAB_STRIKE_MULTIPLIER);
                    reviewVocabWord(vocabMatch.id, 4);
                }

                submitBattleWord(word, damage, isVocabStrike);
                playHit();
                setDamageFloat({ damage, vocab: isVocabStrike });
                setTimeout(() => setDamageFloat(null), 1500);

                setFeedback({
                    text: `"${word}" — ${damage} damage!${isVocabStrike ? ' VOCAB STRIKE!' : ''}`,
                    type: 'success',
                });

                // After player attacks, enemy attacks back (if enemy still alive)
                const state = useGameStore.getState();
                if (state.arenaBattle.enemy && state.arenaBattle.enemy.hp > 0 && state.arenaBattle.status === 'active') {
                    setTimeout(() => {
                        playBoss();
                        enemyAttack();
                        // Refresh letters for next turn
                        fetch('/api/arena/battle', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'generate_letters', difficulty }),
                        })
                            .then((r) => r.json())
                            .then((d) => {
                                if (d.letters) refreshLetterPool(d.letters);
                            });
                    }, 800);
                }

                // Check for victory/defeat
                setTimeout(() => {
                    const s = useGameStore.getState();
                    if (s.arenaBattle.status === 'victory') {
                        handleBattleEnd(true);
                    } else if (s.arenaBattle.status === 'defeat') {
                        handleBattleEnd(false);
                    }
                }, 1200);
            } else {
                playError();
                setFeedback({ text: data.reason || 'Not a valid word.', type: 'error' });
            }
        } catch {
            setFeedback({ text: 'Validation failed. Try again.', type: 'error' });
        } finally {
            setSelectedLetters([]);
            setCurrentWord('');
            setValidating(false);
        }
    }, [currentWord, vocabWords, difficulty, submitBattleWord, enemyAttack, refreshLetterPool, reviewVocabWord, validating, playHit, playBoss, playError]);

    const handleBattleEnd = useCallback((victory: boolean) => {
        const state = useGameStore.getState();
        const config = BATTLE_CONFIG[difficulty];
        const ctx = buildRewardContext(state);

        // Check achievements BEFORE endBattle resets session state
        checkAchievements();

        // Sync to knowledge graph before state reset (victory only)
        if (victory && state.arenaBattle.enemy) {
            syncBattleResults(state.arenaBattle.wordsUsed, state.arenaBattle.enemy.name);
        }

        let xpEarned = 0;
        let goldEarned = 0;
        let itemName = '';

        if (victory) {
            playVictory();

            const xpBreakdown = calculateReward(config.baseXp, 'xp', ctx);
            const goldBreakdown = calculateReward(config.baseGold, 'gold', ctx);
            xpEarned = xpBreakdown.final;
            goldEarned = goldBreakdown.final;
            addXP(xpEarned);
            addGold(goldEarned);

            // Item drop chance
            if (Math.random() < ARENA_LOOT_CHANCE[difficulty]) {
                const rarities = ['Common', 'Uncommon', 'Rare', 'Epic'] as const;
                const rarityIdx = Math.min(DIFFICULTIES.indexOf(difficulty), rarities.length - 1);
                const rarity = rarities[rarityIdx];
                const item = {
                    name: `Arena ${rarity} Trophy`,
                    description: `Won in the Word Battle Arena (${difficulty})`,
                    type: 'material' as const,
                    rarity,
                    icon: '🏆',
                    quantity: 1,
                };
                addItem(item);
                playCoin();
                itemName = item.name;
            }

            logActivity('arena_battle_won', '⚔️', `Won a ${difficulty} Word Battle`, `Dealt ${state.arenaBattle.totalDamageDealt} total damage`);
        } else {
            playError();
        }

        setReward({ xp: xpEarned, gold: goldEarned, bonus: victory ? `${state.arenaBattle.vocabStrikes} Vocab Strikes` : '', item: itemName });
        setShowReward(true);
        endBattle(victory);

        // Check achievements AFTER endBattle for stats-based ones
        checkAchievements();
    }, [difficulty, addXP, addGold, addItem, logActivity, endBattle, checkAchievements, syncBattleResults, playVictory, playError, playCoin]);

    // Check for defeat after enemy attack
    useEffect(() => {
        if (battle.status === 'defeat') {
            handleBattleEnd(false);
        }
    }, [battle.status]);

    // Idle state — show difficulty selector
    if (battle.status === 'idle') {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <Swords className="mx-auto mb-3 text-[var(--color-purple)]" size={48} />
                    <h2 className="text-2xl font-bold mb-2">Word Battle Arena</h2>
                    <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
                        Form words from letter tiles to deal damage to AI-generated enemies.
                        Use your vocabulary words for bonus Vocab Strike damage!
                    </p>
                </div>

                <div className="flex items-center gap-2 justify-center text-sm text-[var(--color-text-secondary)]">
                    <Trophy size={14} /> Win Streak: <span className="font-bold text-[var(--color-text-primary)]">{stats.battleWinStreak}</span>
                    <span className="mx-2">|</span>
                    Record: <span className="font-bold text-amber-400">{stats.bestBattleWinStreak}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                    {DIFFICULTIES.map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`p-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                                difficulty === d
                                    ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/10 text-[var(--color-purple)]'
                                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-text-secondary)]'
                            }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <div className="text-center">
                    <button
                        onClick={handleStartBattle}
                        disabled={arenaLoading}
                        className="px-8 py-3 bg-[var(--color-purple)] hover:bg-[var(--color-purple-hover)] text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        {arenaLoading ? 'Summoning Enemy...' : 'Start Battle'}
                    </button>
                </div>

                <p className="text-center text-xs text-[var(--color-text-muted)]">
                    Keys 1-9/0 to select letters, Enter to attack, Esc to clear
                </p>
            </div>
        );
    }

    // Active battle
    return (
        <div className="space-y-4">
            {/* Enemy */}
            {battle.enemy && <EnemyCard enemy={battle.enemy} />}

            {/* Turn timer bar (time_pressure) */}
            {turnTimerMs !== null && turnTimerMs > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold">
                        <Timer size={12} className="animate-pulse" />
                        Time Pressure: {(turnTimerMs / 1000).toFixed(1)}s
                    </div>
                    <div className="w-full h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-cyan-400"
                            animate={{ width: `${(turnTimerMs / 15000) * 100}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>
                </div>
            )}

            {/* Damage float */}
            <AnimatePresence>
                {damageFloat && (
                    <motion.div
                        className={`text-center text-2xl font-bold ${damageFloat.vocab ? 'text-amber-400' : 'text-red-400'}`}
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -40 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                    >
                        -{damageFloat.damage} {damageFloat.vocab && '⚡ VOCAB STRIKE'}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Player HP */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="flex items-center gap-1 text-sm font-semibold">
                        <Heart size={14} className="text-red-400" /> Your HP
                    </span>
                    <span className="text-sm">{battle.playerHp} / {battle.playerMaxHp}</span>
                </div>
                <div className="w-full h-2.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-green-500 rounded-full"
                        animate={{ width: `${(battle.playerHp / battle.playerMaxHp) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                    <span>Turn {battle.currentTurn} / {battle.maxTurns}</span>
                    <span>Words used: {battle.wordsUsed.length}</span>
                </div>
            </div>

            {/* Current word display */}
            <div className="bg-[var(--color-bg-dark)] rounded-xl p-4 text-center min-h-[56px] flex items-center justify-center">
                {currentWord ? (
                    <span className="text-2xl font-bold tracking-wider">{currentWord}</span>
                ) : (
                    <span className="text-[var(--color-text-muted)]">Tap letters to form a word</span>
                )}
            </div>

            {/* Letter tiles */}
            <div className="flex flex-wrap gap-2 justify-center">
                {battle.letterPool.map((letter, i) => (
                    <LetterTile
                        key={`${i}-${letter}`}
                        letter={letter}
                        selected={selectedLetters.includes(i)}
                        shortcutKey={i < 9 ? String(i + 1) : i === 9 ? '0' : undefined}
                        onClick={() => toggleLetter(i)}
                    />
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => { setSelectedLetters([]); setCurrentWord(''); }}
                    className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-card)] transition-colors"
                >
                    Clear
                </button>
                <button
                    onClick={handleSubmitWord}
                    disabled={currentWord.length < 2 || validating}
                    className="px-6 py-2 bg-[var(--color-purple)] hover:bg-[var(--color-purple-hover)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {validating ? 'Checking...' : 'Attack!'}
                </button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-center text-sm font-semibold p-2 rounded-lg ${
                            feedback.type === 'success' ? 'text-green-400 bg-green-900/20' :
                            feedback.type === 'error' ? 'text-red-400 bg-red-900/20' :
                            'text-blue-400 bg-blue-900/20'
                        }`}
                    >
                        {feedback.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reward modal */}
            <ArenaRewardModal
                open={showReward}
                onClose={() => setShowReward(false)}
                title="Battle Complete"
                victory={reward.xp > 0}
                xpEarned={reward.xp}
                goldEarned={reward.gold}
                bonusInfo={reward.bonus}
                itemDropped={reward.item}
            />
        </div>
    );
}
