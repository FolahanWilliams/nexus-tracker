import type { StateCreator } from 'zustand';
import type { GameState, VocabSlice, VocabWord, VocabStatus, VocabDifficulty } from '../types';
import {
    VOCAB_REVIEW_XP,
    VOCAB_REVIEW_GOLD,
    VOCAB_MASTERY_BONUS,
    SM2_MIN_EASE,
    SM2_MAX_EASE,
    SM2_DEFAULT_EASE,
    SM2_MAX_INTERVAL,
    SM2_REVIEWING_REPS,
    SM2_MASTERY_INTERVAL,
    VOCAB_LEVEL_UP_ACCURACY,
    VOCAB_LEVEL_DOWN_ACCURACY,
    VOCAB_LEVEL_UP_MASTERED_MIN,
    VOCAB_LEVEL_EVAL_MIN_REVIEWED,
    VOCAB_LEVEL_EVAL_SAMPLE_SIZE,
    VOCAB_LEVEL_EVAL_MIN_WORDS,
} from '@/lib/constants';

export const createVocabSlice: StateCreator<GameState, [], [], VocabSlice> = (set, get) => ({
    // ── State ──
    vocabWords: [],
    vocabDailyDate: null,
    vocabCurrentLevel: 'intermediate' as VocabDifficulty,
    vocabStreak: 0,
    vocabLastReviewDate: null,

    // ── Actions ──
    addVocabWords: (words) => {
        const today = new Date().toISOString().split('T')[0];
        const newWords: VocabWord[] = words.map(w => ({
            ...w,
            id: crypto.randomUUID(),
            dateAdded: today,
            lastReviewed: null,
            totalReviews: 0,
            correctReviews: 0,
            nextReviewDate: today,
            easeFactor: SM2_DEFAULT_EASE,
            interval: 0,
            repetitions: 0,
            status: 'new' as VocabStatus,
        }));
        set(state => ({ vocabWords: [...state.vocabWords, ...newWords] }));
    },

    reviewVocabWord: (wordId, quality, meta) => {
        const today = new Date().toISOString().split('T')[0];
        set(state => {
            const words = state.vocabWords.map(w => {
                if (w.id !== wordId) return w;
                let { easeFactor, interval, repetitions } = w;
                const isCorrect = quality >= 3;

                // ── Confidence-adjusted quality (Item 3) ──
                // Low confidence + correct → downgrade quality (they guessed)
                // High confidence + wrong → extra penalty (overconfidence)
                let adjustedQuality = quality;
                const conf = meta?.confidence ?? w.confidenceRating;
                if (conf != null) {
                    if (isCorrect && conf <= 2) {
                        // Correct but low confidence → quality 3 instead of 4/5
                        adjustedQuality = Math.min(adjustedQuality, 3) as 0 | 1 | 2 | 3 | 4 | 5;
                    } else if (!isCorrect && conf >= 4) {
                        // Overconfident and wrong → harsher penalty
                        adjustedQuality = Math.min(adjustedQuality, 0) as 0 | 1 | 2 | 3 | 4 | 5;
                    }
                }

                // ── Response time adjustment (Item 4) ──
                // Fast + correct → boost quality; Slow + correct → lower quality
                const responseMs = meta?.responseTimeMs;
                if (responseMs != null && isCorrect) {
                    if (responseMs < 3000) {
                        // Fast and correct → bump quality up by 1 (max 5)
                        adjustedQuality = Math.min(5, adjustedQuality + 1) as 0 | 1 | 2 | 3 | 4 | 5;
                    } else if (responseMs > 15000) {
                        // Very slow but correct → reduce quality by 1 (min 3 since still correct)
                        adjustedQuality = Math.max(3, adjustedQuality - 1) as 0 | 1 | 2 | 3 | 4 | 5;
                    }
                }

                if (isCorrect) {
                    if (repetitions === 0) interval = 1;
                    else if (repetitions === 1) interval = 3;
                    else interval = Math.min(SM2_MAX_INTERVAL, Math.round(interval * easeFactor));
                    repetitions += 1;
                } else {
                    repetitions = Math.max(0, repetitions - 1);
                    interval = repetitions === 0 ? 0 : 1;
                }

                easeFactor = Math.min(SM2_MAX_EASE, Math.max(SM2_MIN_EASE,
                    easeFactor + (0.1 - (5 - adjustedQuality) * (0.08 + (5 - adjustedQuality) * 0.02))
                ));

                let status: VocabStatus = w.status;
                if (repetitions < SM2_REVIEWING_REPS) status = 'learning';
                else if (interval < SM2_MASTERY_INTERVAL) status = 'reviewing';
                else status = 'mastered';

                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + Math.max(interval, 1));
                const nextReviewDate = nextDate.toISOString().split('T')[0];

                // ── Track response time (rolling average) ──
                let avgResponseTimeMs = w.avgResponseTimeMs;
                if (responseMs != null) {
                    avgResponseTimeMs = avgResponseTimeMs != null
                        ? Math.round(avgResponseTimeMs * 0.7 + responseMs * 0.3) // exponential moving average
                        : responseMs;
                }

                // ── Track failed quiz types ──
                let failedQuizTypes = w.failedQuizTypes || [];
                let consecutiveFailures = w.consecutiveFailures || 0;
                if (!isCorrect && meta?.quizType) {
                    failedQuizTypes = [...new Set([...failedQuizTypes, meta.quizType])];
                    consecutiveFailures += 1;
                } else if (isCorrect) {
                    consecutiveFailures = 0;
                    // Remove the quiz type from failed list on success
                    if (meta?.quizType) {
                        failedQuizTypes = failedQuizTypes.filter(t => t !== meta.quizType);
                    }
                }

                return {
                    ...w,
                    easeFactor, interval, repetitions, status, nextReviewDate,
                    lastReviewed: today,
                    totalReviews: w.totalReviews + 1,
                    correctReviews: w.correctReviews + (isCorrect ? 1 : 0),
                    lastConfidenceCorrect: isCorrect,
                    avgResponseTimeMs,
                    failedQuizTypes,
                    consecutiveFailures,
                };
            });
            return { vocabWords: words };
        });

        const xpGain = quality >= 4 ? VOCAB_REVIEW_XP.high : quality >= 3 ? VOCAB_REVIEW_XP.mid : VOCAB_REVIEW_XP.low;
        get().addXP(xpGain);
        const goldGain = quality >= 3 ? VOCAB_REVIEW_GOLD.correct : VOCAB_REVIEW_GOLD.incorrect;
        get().addGold(goldGain);

        const updated = get().vocabWords.find(w => w.id === wordId);
        if (updated?.status === 'mastered' && updated.repetitions === SM2_REVIEWING_REPS && updated.interval >= SM2_MASTERY_INTERVAL) {
            get().addXP(VOCAB_MASTERY_BONUS.xp);
            get().addGold(VOCAB_MASTERY_BONUS.gold);
            get().logActivity('achievement', '📖', `Mastered "${updated.word}"!`, `WordForge mastery bonus: +${VOCAB_MASTERY_BONUS.xp} XP`);
        }
    },

    setVocabDailyDate: (date) => set({ vocabDailyDate: date }),

    updateVocabLevel: () => {
        const state = get();
        const words = state.vocabWords;
        if (words.length < VOCAB_LEVEL_EVAL_MIN_WORDS) return;

        const reviewed = words
            .filter(w => w.totalReviews > 0)
            .sort((a, b) => (b.lastReviewed || '').localeCompare(a.lastReviewed || ''))
            .slice(0, VOCAB_LEVEL_EVAL_SAMPLE_SIZE);

        if (reviewed.length < VOCAB_LEVEL_EVAL_MIN_REVIEWED) return;

        const totalReviews = reviewed.reduce((s, w) => s + w.totalReviews, 0);
        const totalCorrect = reviewed.reduce((s, w) => s + w.correctReviews, 0);
        const accuracy = totalCorrect / totalReviews;

        const levels: VocabDifficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];
        const currentIdx = levels.indexOf(state.vocabCurrentLevel);

        const masteredAtLevel = words.filter(w => w.status === 'mastered' && w.difficulty === state.vocabCurrentLevel).length;

        if (accuracy > VOCAB_LEVEL_UP_ACCURACY && masteredAtLevel >= VOCAB_LEVEL_UP_MASTERED_MIN && currentIdx < levels.length - 1) {
            set({ vocabCurrentLevel: levels[currentIdx + 1] });
        } else if (accuracy < VOCAB_LEVEL_DOWN_ACCURACY && currentIdx > 0) {
            set({ vocabCurrentLevel: levels[currentIdx - 1] });
        }
    },

    deleteVocabWord: (wordId) => {
        set(state => ({ vocabWords: state.vocabWords.filter(w => w.id !== wordId) }));
    },

    restoreVocabWord: (word) => {
        set(state => ({ vocabWords: [...state.vocabWords, word] }));
    },

    batchDeleteVocabWords: (wordIds) => {
        const idSet = new Set(wordIds);
        set(state => ({ vocabWords: state.vocabWords.filter(w => !idSet.has(w.id)) }));
    },

    batchRescheduleVocabWords: (wordIds) => {
        const today = new Date().toISOString().split('T')[0];
        const idSet = new Set(wordIds);
        set(state => ({
            vocabWords: state.vocabWords.map(w =>
                idSet.has(w.id) ? { ...w, nextReviewDate: today } : w
            ),
        }));
    },

    batchSetVocabDifficulty: (wordIds, difficulty) => {
        const idSet = new Set(wordIds);
        set(state => ({
            vocabWords: state.vocabWords.map(w =>
                idSet.has(w.id) ? { ...w, difficulty } : w
            ),
        }));
    },

    checkVocabStreak: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (state.vocabLastReviewDate === today) return;

        if (state.vocabLastReviewDate === yesterday) {
            set({ vocabStreak: state.vocabStreak + 1, vocabLastReviewDate: today });
        } else {
            set({ vocabStreak: 1, vocabLastReviewDate: today });
        }

        get().checkAchievements();
    },

    setUserMnemonic: (wordId, mnemonic) => {
        set(state => ({
            vocabWords: state.vocabWords.map(w => w.id === wordId ? { ...w, userMnemonic: mnemonic } : w),
        }));
    },

    setWordConfidence: (wordId, confidence) => {
        set(state => ({
            vocabWords: state.vocabWords.map(w => w.id === wordId ? { ...w, confidenceRating: confidence } : w),
        }));
    },
});
