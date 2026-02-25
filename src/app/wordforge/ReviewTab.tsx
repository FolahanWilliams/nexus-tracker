'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, CheckCircle, XCircle,
  Brain, BarChart3, HelpCircle,
  Layers, ThumbsUp, ThumbsDown, Minus, ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';
import { shuffleArray, QuizQuestion } from './shared';
import { VOCAB_REVIEW_XP } from '@/lib/constants';

export default function ReviewTab() {
  const {
    vocabWords, reviewVocabWord, checkVocabStreak,
    updateVocabLevel, vocabStreak, logActivity, setWordConfidence,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [mode, setMode] = useState<'idle' | 'loading' | 'study' | 'quiz' | 'recall' | 'done'>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [recallInput, setRecallInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ word: string; correct: boolean; confidence?: number }[]>([]);
  const [showHint, setShowHint] = useState(false);

  // Study Cards state
  const [studyCardIdx, setStudyCardIdx] = useState(0);
  const [studyCardFlipped, setStudyCardFlipped] = useState(false);
  const [studyBatch, setStudyBatch] = useState<ReturnType<typeof useGameStore.getState>['vocabWords']>([]);
  const [pendingQuizType, setPendingQuizType] = useState<'quiz' | 'recall'>('quiz');

  // Practice mode: quiz on all words when none are due
  const [isPractice, setIsPractice] = useState(false);

  // Confidence tracking state
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, number>>({});

  const today = new Date().toISOString().split('T')[0];
  const dueWords = useMemo(
    () => vocabWords.filter(w => w.nextReviewDate <= today),
    [vocabWords, today]
  );

  const startStudyCards = useCallback((nextMode: 'quiz' | 'recall', practice = false) => {
    const pool = practice ? vocabWords : dueWords;
    if (pool.length === 0) {
      addToast(practice ? 'No words to practice!' : 'No words due for review!', 'info');
      return;
    }
    setIsPractice(practice);
    const batch = shuffleArray(pool).slice(0, 10);
    setStudyBatch(batch);
    setStudyCardIdx(0);
    setStudyCardFlipped(false);
    setPendingQuizType(nextMode);
    setConfidenceRatings({});
    setMode('study');
  }, [dueWords, vocabWords, addToast]);

  const handleStudyConfidence = (wordId: string, confidence: number) => {
    setConfidenceRatings(prev => ({ ...prev, [wordId]: confidence }));
    setWordConfidence(wordId, confidence);
  };

  const advanceStudyCard = () => {
    if (studyCardIdx < studyBatch.length - 1) {
      setStudyCardIdx(prev => prev + 1);
      setStudyCardFlipped(false);
    } else {
      // Done studying — transition to quiz or recall
      if (pendingQuizType === 'quiz') {
        launchQuiz();
      } else {
        launchFreeRecall();
      }
    }
  };

  const skipStudyCards = () => {
    if (pendingQuizType === 'quiz') {
      launchQuiz();
    } else {
      launchFreeRecall();
    }
  };

  const launchQuiz = useCallback(async () => {
    setMode('loading');
    setSessionResults([]);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setShowHint(false);

    // Use the already-shuffled study batch so question order differs each session
    const reviewBatch = studyBatch.length > 0 ? studyBatch : shuffleArray(dueWords).slice(0, 10);
    try {
      const res = await fetch('/api/vocab/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: reviewBatch.map(w => ({
            word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech,
          })),
          allWords: vocabWords.map(w => ({
            word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech,
          })),
        }),
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        // Shuffle the returned questions so they don't follow input order
        setQuestions(shuffleArray(data.questions));
        setMode('quiz');
      } else {
        addToast('Could not generate quiz. Try free recall instead.', 'error');
        setMode('idle');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Quiz generation failed: ${message}`, 'wordforge');
      addToast('Network error generating quiz.', 'error');
      setMode('idle');
    }
  }, [dueWords, studyBatch, vocabWords, addToast]);

  const launchFreeRecall = useCallback(() => {
    // Use the already-shuffled study batch, or shuffle due words as fallback
    const pool = studyBatch.length > 0 ? studyBatch : shuffleArray(dueWords).slice(0, 10);
    const batch = shuffleArray(pool).map(w => ({
      word: w.word,
      type: 'free_recall' as const,
      question: `What does "${w.word}" mean?`,
      hint: `It's a ${w.partOfSpeech}. First letter: ${w.word[0]}`,
    }));
    setQuestions(batch);
    setMode('recall');
    setCurrentIdx(0);
    setSessionResults([]);
    setRecallInput('');
    setShowAnswer(false);
    setShowHint(false);
  }, [dueWords, studyBatch]);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMCAnswer = (optionIdx: number) => {
    if (showAnswer) return;
    setSelectedAnswer(optionIdx);
    setShowAnswer(true);
    const q = questions[currentIdx];
    const correct = optionIdx === q.correctIndex;
    const wordObj = vocabWords.find(w => w.word === q.word);
    // Only update SM-2 scheduling during real reviews, not practice
    if (wordObj && !isPractice) {
      const quality = correct ? 4 : 1;
      reviewVocabWord(wordObj.id, quality as 0 | 1 | 2 | 3 | 4 | 5);
    }
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    setSessionResults(prev => [...prev, { word: q.word, correct, confidence: conf }]);
    // Only show XP float for real reviews (practice doesn't award XP)
    if (correct && !isPractice) {
      triggerXPFloat(`+${VOCAB_REVIEW_XP.high} XP`, '#4ade80');
    }
    // Auto-advance after a brief delay so user can see the result
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      advanceQuestion();
    }, correct ? 800 : 1500); // faster for correct, slower for incorrect so they can learn
  };

  // Clean up auto-advance timer on unmount or mode change
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [mode]);

  const handleRecallSelfGrade = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    const q = questions[currentIdx];
    const wordObj = vocabWords.find(w => w.word === q.word);
    // Only update SM-2 scheduling during real reviews, not practice
    if (wordObj && !isPractice) {
      reviewVocabWord(wordObj.id, quality);
    }
    const correct = quality >= 3;
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    setSessionResults(prev => [...prev, { word: q.word, correct, confidence: conf }]);
    // Only show XP float for real reviews
    if (correct && !isPractice) {
      triggerXPFloat(`+${VOCAB_REVIEW_XP.mid} XP`, '#4ade80');
    }
    advanceQuestion();
  };

  const advanceQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setRecallInput('');
      setShowHint(false);
    } else {
      setMode('done');
      if (!isPractice) {
        checkVocabStreak();
        updateVocabLevel();
      }
      const correctCount = sessionResults.length > 0
        ? sessionResults.filter(r => r.correct).length + (selectedAnswer === questions[currentIdx]?.correctIndex ? 1 : 0)
        : 0;
      const acc = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      const label = isPractice ? 'Practice' : 'Review';
      addToast(`${label} complete! ${correctCount}/${questions.length} correct`, 'success');
      logActivity('xp_earned', '🧠', `Vocab ${label.toLowerCase()}: ${correctCount}/${questions.length} correct (${acc}%)`, `WordForge ${label.toLowerCase()} session`);
    }
  };

  // ── Idle state ──
  if (mode === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Words Due for Review</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
              background: dueWords.length > 0 ? 'var(--color-orange)' : 'var(--color-green)',
              color: 'white',
            }}>
              {dueWords.length}
            </span>
          </div>
          {dueWords.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {dueWords.slice(0, 8).map(w => (
                <span key={w.id} className="text-xs px-2 py-1 rounded bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  {w.word}
                </span>
              ))}
              {dueWords.length > 8 && (
                <span className="text-xs px-2 py-1 text-[var(--color-text-muted)]">+{dueWords.length - 8} more</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">All caught up! Come back later.</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => startStudyCards('quiz')}
              disabled={dueWords.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              <BarChart3 size={16} /> Multiple Choice
            </button>
            <button
              onClick={() => startStudyCards('recall')}
              disabled={dueWords.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-purple)] text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              <Brain size={16} /> Free Recall
            </button>
          </div>

          {/* Practice mode — available when no words are due but words exist */}
          {dueWords.length === 0 && vocabWords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                <RefreshCw size={10} /> Practice Mode — quiz without affecting review schedule
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => startStudyCards('quiz', true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110 border border-[var(--color-blue)]/40 text-[var(--color-blue)] bg-[var(--color-blue)]/10"
                >
                  <BarChart3 size={14} /> Practice Quiz
                </button>
                <button
                  onClick={() => startStudyCards('recall', true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110 border border-[var(--color-purple)]/40 text-[var(--color-purple)] bg-[var(--color-purple)]/10"
                >
                  <Brain size={14} /> Practice Recall
                </button>
              </div>
            </div>
          )}
        </div>

        {vocabStreak > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-bold">{vocabStreak}-day vocab streak!</span>
          </div>
        )}
      </div>
    );
  }

  // ── Study Cards phase ──
  if (mode === 'study') {
    const card = studyBatch[studyCardIdx];
    const studyProgress = ((studyCardIdx + 1) / studyBatch.length) * 100;
    const currentConfidence = card ? confidenceRatings[card.id] : undefined;

    return (
      <div className="space-y-4">
        {/* Progress + skip */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-hover)]">
            <div className="h-full rounded-full bg-[var(--color-green)] transition-all" style={{ width: `${studyProgress}%` }} />
          </div>
          <span className="text-xs text-[var(--color-text-secondary)] font-mono">{studyCardIdx + 1}/{studyBatch.length}</span>
          <button
            onClick={skipStudyCards}
            className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors underline"
          >
            Skip to quiz
          </button>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
          <Layers size={12} /> {isPractice ? 'Practice Cards' : 'Study Cards'} — review before your quiz
        </p>

        {/* Flashcard */}
        {card && (
          <AnimatePresence mode="wait">
            <motion.div
              key={studyCardIdx}
              initial={{ opacity: 0, rotateY: -10 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 10 }}
              transition={{ duration: 0.25 }}
              onClick={() => setStudyCardFlipped(!studyCardFlipped)}
              className="cursor-pointer min-h-[200px] p-5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex flex-col justify-center hover:border-[var(--color-green)] transition-colors"
            >
              {!studyCardFlipped ? (
                <div className="text-center space-y-3">
                  <p className="text-2xl font-bold text-white">{card.word}</p>
                  <p className="text-xs italic text-[var(--color-text-secondary)]">{card.partOfSpeech} &middot; {card.pronunciation}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-4">Tap to reveal definition</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-lg font-bold text-white text-center">{card.word}</p>
                  <p className="text-sm text-[var(--color-text-primary)]">{card.definition}</p>
                  {card.etymology && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      <span className="text-[var(--color-orange)] font-bold">Origin:</span> {card.etymology}
                    </p>
                  )}
                  {card.examples[0] && (
                    <p className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                      &ldquo;{card.examples[0]}&rdquo;
                    </p>
                  )}
                  {card.relatedWords && card.relatedWords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {card.relatedWords.map((rw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)]">{rw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Confidence rating */}
        {card && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 flex items-center gap-1">
              <Lightbulb size={11} /> How confident are you on this word?
            </p>
            <div className="flex gap-2">
              {[
                { val: 1, label: 'No clue', color: 'var(--color-red)' },
                { val: 2, label: 'Shaky', color: 'var(--color-orange)' },
                { val: 3, label: 'Okay', color: 'var(--color-blue)' },
                { val: 4, label: 'Good', color: 'var(--color-purple)' },
                { val: 5, label: 'Know it', color: 'var(--color-green)' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => handleStudyConfidence(card.id, opt.val)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold transition-all border"
                  style={{
                    background: currentConfidence === opt.val ? `${opt.color}20` : 'transparent',
                    borderColor: currentConfidence === opt.val ? opt.color : 'var(--color-border)',
                    color: currentConfidence === opt.val ? opt.color : 'var(--color-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next / Start Quiz */}
        <button
          onClick={advanceStudyCard}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-green)] text-white hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          {studyCardIdx < studyBatch.length - 1 ? (
            <>Next Card <ArrowRight size={14} /></>
          ) : (
            <>Start {pendingQuizType === 'quiz' ? 'Quiz' : 'Recall'} <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    );
  }

  // ── Loading ──
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="text-sm">Generating quiz questions...</p>
      </div>
    );
  }

  // ── Done state ──
  if (mode === 'done') {
    const correctCount = sessionResults.filter(r => r.correct).length;
    const accuracy = sessionResults.length > 0 ? Math.round((correctCount / sessionResults.length) * 100) : 0;

    // Metacognitive insights: compare confidence vs actual correctness
    const hasConfidenceData = sessionResults.some(r => r.confidence != null);
    const overconfidentWords = sessionResults.filter(r => r.confidence != null && r.confidence >= 4 && !r.correct);
    const underconfidentWords = sessionResults.filter(r => r.confidence != null && r.confidence <= 2 && r.correct);
    const calibratedWords = sessionResults.filter(r => r.confidence != null && ((r.confidence >= 3 && r.correct) || (r.confidence <= 2 && !r.correct)));

    return (
      <div className="space-y-4">
        <div className="text-center py-8 p-6 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="text-4xl mb-3">{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '💪' : '📖'}</div>
          <h3 className="text-lg font-bold mb-1">{isPractice ? 'Practice' : 'Session'} Complete!</h3>
          <p className="text-2xl font-bold mb-1" style={{ color: accuracy >= 80 ? 'var(--color-green)' : accuracy >= 50 ? 'var(--color-orange)' : 'var(--color-red)' }}>
            {accuracy}% Accuracy
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">{correctCount}/{sessionResults.length} correct</p>
        </div>

        {/* Metacognitive insight panel */}
        {hasConfidenceData && (
          <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] space-y-3">
            <p className="text-xs uppercase font-bold text-[var(--color-purple)] tracking-wider flex items-center gap-1">
              <Lightbulb size={13} /> Confidence vs Reality
            </p>

            {overconfidentWords.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-[var(--color-orange)] flex items-center gap-1">
                  <ThumbsDown size={10} /> Overconfident — felt sure, got wrong
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {overconfidentWords.map((r, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-[var(--color-orange)]/15 text-[var(--color-orange)] border border-[var(--color-orange)]/20">
                      {r.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {underconfidentWords.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-[var(--color-green)] flex items-center gap-1">
                  <ThumbsUp size={10} /> Underconfident — doubted yourself, got right!
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {underconfidentWords.map((r, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/20">
                      {r.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {calibratedWords.length > 0 && (
              <p className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1">
                <Minus size={10} /> Well-calibrated on {calibratedWords.length} word{calibratedWords.length !== 1 ? 's' : ''}
              </p>
            )}

            {overconfidentWords.length === 0 && underconfidentWords.length === 0 && (
              <p className="text-xs text-[var(--color-green)]">Your confidence matched your performance perfectly!</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {sessionResults.map((r, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded bg-[var(--color-bg-hover)] text-sm">
              {r.correct ? <CheckCircle size={14} className="text-[var(--color-green)]" /> : <XCircle size={14} className="text-[var(--color-red)]" />}
              <span className={r.correct ? 'text-white' : 'text-[var(--color-text-secondary)]'}>{r.word}</span>
              {r.confidence != null && (
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                  conf: {r.confidence}/5
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setMode('idle')}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            Back to Review
          </button>
          {vocabWords.length > 0 && (
            <button
              onClick={() => startStudyCards('quiz', true)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-[var(--color-blue)]/40 text-[var(--color-blue)] bg-[var(--color-blue)]/10 hover:bg-[var(--color-blue)]/20 transition-colors"
            >
              Practice Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Active quiz / recall ──
  const q = questions[currentIdx];
  const currentWord = vocabWords.find(w => w.word === q?.word);
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-hover)]">
          <div className="h-full rounded-full bg-[var(--color-blue)] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-[var(--color-text-secondary)] font-mono">{currentIdx + 1}/{questions.length}</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="p-5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]"
        >
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
            {mode === 'recall' ? 'Free Recall' : (q?.type || 'multiple choice').replace(/_/g, ' ')}
          </p>
          <p className="text-base font-bold text-white mb-4">{q?.question}</p>

          {/* Hint */}
          {q?.hint && (
            <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-blue)] mb-3 transition-colors">
              <HelpCircle size={12} /> {showHint ? q.hint : 'Show hint'}
            </button>
          )}

          {/* Multiple choice options */}
          {mode === 'quiz' && q?.options && (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                let bg = 'var(--color-bg-hover)';
                let border = 'var(--color-border)';
                if (showAnswer) {
                  if (i === q.correctIndex) { bg = 'rgba(74,222,128,0.15)'; border = 'var(--color-green)'; }
                  else if (i === selectedAnswer && i !== q.correctIndex) { bg = 'rgba(248,113,113,0.15)'; border = 'var(--color-red)'; }
                } else if (i === selectedAnswer) {
                  bg = 'var(--color-bg-card)'; border = 'var(--color-blue)';
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleMCAnswer(i)}
                    disabled={showAnswer}
                    className="w-full text-left p-3 rounded-md text-sm transition-all border"
                    style={{ background: bg, borderColor: border }}
                  >
                    <span className="font-mono text-[var(--color-text-secondary)] mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}

              {showAnswer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
                  <button
                    onClick={() => {
                      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
                      advanceQuestion();
                    }}
                    className="w-full py-1.5 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-hover)] transition-all flex items-center justify-center gap-1"
                  >
                    {currentIdx < questions.length - 1 ? 'Skip ahead →' : 'Finish now →'}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Free recall mode */}
          {mode === 'recall' && (
            <div className="space-y-3">
              {!showAnswer ? (
                <>
                  <textarea
                    value={recallInput}
                    onChange={e => setRecallInput(e.target.value)}
                    placeholder="Type the definition from memory..."
                    className="w-full p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-sm text-white resize-none focus:outline-none focus:border-[var(--color-blue)]"
                    rows={3}
                  />
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-purple)] text-white hover:brightness-110 transition-all"
                  >
                    Reveal Answer
                  </button>
                </>
              ) : (
                <>
                  {/* Show the correct definition */}
                  <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-green)] mb-1">Correct Definition</p>
                    <p className="text-sm text-white">{currentWord?.definition}</p>
                  </div>
                  {recallInput.trim() && (
                    <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                      <p className="text-[10px] uppercase font-bold text-[var(--color-blue)] mb-1">Your Answer</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">{recallInput}</p>
                    </div>
                  )}
                  <p className="text-xs text-[var(--color-text-secondary)] text-center">How well did you remember?</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleRecallSelfGrade(1)} className="py-2 rounded-md text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                      Forgot
                    </button>
                    <button onClick={() => handleRecallSelfGrade(3)} className="py-2 rounded-md text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-colors">
                      Partially
                    </button>
                    <button onClick={() => handleRecallSelfGrade(5)} className="py-2 rounded-md text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors">
                      Perfect
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
