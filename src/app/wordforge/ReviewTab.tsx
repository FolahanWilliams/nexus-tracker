'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, CheckCircle, XCircle,
  Brain, BarChart3, HelpCircle,
  Layers, ThumbsUp, ThumbsDown, Minus, ArrowRight,
  Lightbulb, Type, PenTool, BookOpen, Square, Infinity,
  MessageSquare, Repeat2,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';
import { shuffleArray, QuizQuestion, QuizType, SentenceGradeResult } from './shared';
import { VOCAB_REVIEW_XP } from '@/lib/constants';

export default function ReviewTab() {
  const {
    vocabWords, reviewVocabWord, checkVocabStreak,
    updateVocabLevel, vocabStreak, logActivity, setWordConfidence, setUserMnemonic,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [mode, setMode] = useState<'idle' | 'loading' | 'study' | 'quiz' | 'recall' | 'done'>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [recallInput, setRecallInput] = useState('');
  const [spellingInput, setSpellingInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ word: string; correct: boolean; confidence?: number }[]>([]);
  const [showHint, setShowHint] = useState(false);

  // Study Cards state
  const [studyCardIdx, setStudyCardIdx] = useState(0);
  const [studyCardFlipped, setStudyCardFlipped] = useState(false);
  const [studyBatch, setStudyBatch] = useState<ReturnType<typeof useGameStore.getState>['vocabWords']>([]);
  const [pendingQuizType, setPendingQuizType] = useState<'quiz' | 'recall'>('quiz');

  // Selected quiz mode — 'adaptive' lets AI pick, or user picks a specific type
  const [quizMode, setQuizMode] = useState<QuizType | 'adaptive'>('adaptive');

  // Interactive study card state (Item 6)
  const [studyRecallInput, setStudyRecallInput] = useState('');
  const [studyRecallSubmitted, setStudyRecallSubmitted] = useState(false);
  const [studyMnemonicInput, setStudyMnemonicInput] = useState('');
  const [studyMnemonicSaved, setStudyMnemonicSaved] = useState(false);

  // Confidence tracking state
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, number>>({});

  // Response time tracking (Item 4)
  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now());

  // Endless study mode
  const [isEndless, setIsEndless] = useState(false);
  const [endlessBatchCount, setEndlessBatchCount] = useState(0);
  const endlessResultsRef = useRef<{ word: string; correct: boolean; confidence?: number }[]>([]);
  const endlessReviewedIdsRef = useRef<Set<string>>(new Set());

  // Prefetch next batch for seamless endless transitions
  const prefetchedQuestionsRef = useRef<QuizQuestion[] | null>(null);
  const prefetchedBatchRef = useRef<ReturnType<typeof useGameStore.getState>['vocabWords'] | null>(null);
  const prefetchInProgressRef = useRef(false);

  // Sentence construction & paraphrase challenge state
  const [sentenceInput, setSentenceInput] = useState('');
  const [sentenceGrading, setSentenceGrading] = useState(false);
  const [sentenceGrade, setSentenceGrade] = useState<SentenceGradeResult | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const dueWords = useMemo(
    () => vocabWords.filter(w => w.nextReviewDate <= today),
    [vocabWords, today]
  );

  const startStudyCards = useCallback((nextMode: 'quiz' | 'recall', endless = false) => {
    const pool = endless ? vocabWords : dueWords;
    if (pool.length === 0) {
      addToast(endless ? 'No words available!' : 'No words due for review!', 'info');
      return;
    }
    setIsEndless(endless);
    if (endless) {
      setEndlessBatchCount(0);
      endlessResultsRef.current = [];
      endlessReviewedIdsRef.current = new Set();
    }

    // ── Interleaving (Item 7) ── Mix in old/mastered words with due words
    let batch: typeof vocabWords;
    if (dueWords.length > 0) {
      const maxBatch = 10;
      const dueShuffled = shuffleArray(dueWords);
      // Reserve ~70% for due words, ~30% for interleaved mastered/reviewing words
      const dueCount = Math.min(dueShuffled.length, Math.ceil(maxBatch * 0.7));
      const dueBatch = dueShuffled.slice(0, dueCount);
      const dueIds = new Set(dueBatch.map(w => w.id));
      // Pick interleaved words from non-due mastered/reviewing pool
      const interleaveCandidates = vocabWords.filter(w =>
        !dueIds.has(w.id) && (w.status === 'mastered' || w.status === 'reviewing') && w.totalReviews > 0
      );
      const interleaveCount = Math.min(interleaveCandidates.length, maxBatch - dueCount);
      const interleaveBatch = shuffleArray(interleaveCandidates).slice(0, interleaveCount);
      batch = shuffleArray([...dueBatch, ...interleaveBatch]);
    } else {
      batch = shuffleArray(pool).slice(0, 10);
    }

    if (endless) {
      batch.forEach(w => endlessReviewedIdsRef.current.add(w.id));
    }
    setStudyBatch(batch);
    setStudyCardIdx(0);
    setStudyCardFlipped(false);
    setPendingQuizType(nextMode);
    setConfidenceRatings({});
    setStudyRecallInput('');
    setStudyRecallSubmitted(false);
    setStudyMnemonicInput('');
    setStudyMnemonicSaved(false);
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
      setStudyRecallInput('');
      setStudyRecallSubmitted(false);
      setStudyMnemonicInput('');
      setStudyMnemonicSaved(false);
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
            // Adaptive metadata (Item 2)
            status: w.status,
            confidenceRating: w.confidenceRating,
            lastConfidenceCorrect: w.lastConfidenceCorrect,
            consecutiveFailures: w.consecutiveFailures || 0,
            failedQuizTypes: w.failedQuizTypes || [],
            totalReviews: w.totalReviews,
            etymology: w.etymology,
            relatedWords: w.relatedWords,
            antonym: w.antonym,
          })),
          allWords: vocabWords.map(w => ({
            word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech,
          })),
          ...(quizMode !== 'adaptive' ? { forcedType: quizMode } : {}),
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
        setAnswerStartTime(Date.now());
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
  }, [dueWords, studyBatch, vocabWords, addToast, quizMode]);

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
    setAnswerStartTime(Date.now());
  }, [dueWords, studyBatch]);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMCAnswer = (optionIdx: number) => {
    if (showAnswer) return;
    setSelectedAnswer(optionIdx);
    setShowAnswer(true);
    const q = questions[currentIdx];
    const correct = optionIdx === q.correctIndex;
    const wordObj = vocabWords.find(w => w.word === q.word);
    const responseTimeMs = Date.now() - answerStartTime;
    if (wordObj) {
      const quality = correct ? 4 : 1;
      const conf = confidenceRatings[wordObj.id];
      reviewVocabWord(wordObj.id, quality as 0 | 1 | 2 | 3 | 4 | 5, {
        confidence: conf, responseTimeMs, quizType: q.type,
      });
    }
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    const resultEntry = { word: q.word, correct, confidence: conf };
    setSessionResults(prev => [...prev, resultEntry]);
    if (isEndless) endlessResultsRef.current.push(resultEntry);
    if (correct) {
      triggerXPFloat(`+${VOCAB_REVIEW_XP.high} XP`, '#4ade80');
    }
    // Auto-advance only on correct answers; wrong answers show correction card and require manual continue
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (correct) {
      autoAdvanceRef.current = setTimeout(() => {
        advanceQuestion();
      }, 2500);
    }
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
    const responseTimeMs = Date.now() - answerStartTime;
    if (wordObj) {
      const conf = confidenceRatings[wordObj.id];
      reviewVocabWord(wordObj.id, quality, {
        confidence: conf, responseTimeMs, quizType: q.type,
      });
    }
    const correct = quality >= 3;
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    const resultEntry = { word: q.word, correct, confidence: conf };
    setSessionResults(prev => [...prev, resultEntry]);
    if (isEndless) endlessResultsRef.current.push(resultEntry);
    if (correct) {
      triggerXPFloat(`+${VOCAB_REVIEW_XP.mid} XP`, '#4ade80');
    }
    advanceQuestion();
  };

  const handleSpellingSubmit = () => {
    const q = questions[currentIdx];
    const target = (q.correctSpelling || q.word).toLowerCase().trim();
    const answer = spellingInput.toLowerCase().trim();
    const correct = answer === target;
    setShowAnswer(true);
    const wordObj = vocabWords.find(w => w.word === q.word);
    const responseTimeMs = Date.now() - answerStartTime;
    if (wordObj) {
      const quality = correct ? 5 : 1;
      const conf = confidenceRatings[wordObj.id];
      reviewVocabWord(wordObj.id, quality as 0 | 1 | 2 | 3 | 4 | 5, {
        confidence: conf, responseTimeMs, quizType: q.type,
      });
    }
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    const resultEntry = { word: q.word, correct, confidence: conf };
    setSessionResults(prev => [...prev, resultEntry]);
    if (isEndless) endlessResultsRef.current.push(resultEntry);
    if (correct) {
      triggerXPFloat(`+${VOCAB_REVIEW_XP.high} XP`, '#4ade80');
    }
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (correct) {
      autoAdvanceRef.current = setTimeout(() => advanceQuestion(), 2500);
    }
  };

  const handleSentenceSubmit = async () => {
    const q = questions[currentIdx];
    const wordObj = vocabWords.find(w => w.word === q.word);
    const responseTimeMs = Date.now() - answerStartTime;
    setSentenceGrading(true);
    try {
      const res = await fetch('/api/vocab/grade-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: q.word,
          definition: wordObj?.definition || '',
          partOfSpeech: wordObj?.partOfSpeech || '',
          sentence: sentenceInput,
          challengeType: q.type,
        }),
      });
      const data = await res.json();
      const grade: SentenceGradeResult = data.result;
      setSentenceGrade(grade);
      setShowAnswer(true);

      const correct = grade.correct;
      if (wordObj) {
        const quality = correct ? (grade.score >= 80 ? 5 : 4) : (grade.score >= 40 ? 2 : 1);
        const conf = confidenceRatings[wordObj.id];
        reviewVocabWord(wordObj.id, quality as 0 | 1 | 2 | 3 | 4 | 5, {
          confidence: conf, responseTimeMs, quizType: q.type,
        });
      }
      const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
      const resultEntry = { word: q.word, correct, confidence: conf };
      setSessionResults(prev => [...prev, resultEntry]);
      if (isEndless) endlessResultsRef.current.push(resultEntry);
      if (correct) {
        triggerXPFloat(`+${VOCAB_REVIEW_XP.high} XP`, '#4ade80');
      }
    } catch {
      setSentenceGrade({
        correct: false, score: 0, correctUsage: false, grammar: false,
        naturalness: false, feedback: 'Could not grade. Please try again.',
      });
      setShowAnswer(true);
    }
    setSentenceGrading(false);
  };

  const endEndlessSession = () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    prefetchedQuestionsRef.current = null;
    prefetchedBatchRef.current = null;
    prefetchInProgressRef.current = false;
    setMode('done');
    checkVocabStreak();
    updateVocabLevel();
    const results = endlessResultsRef.current;
    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const acc = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    addToast(`Endless session complete! ${correctCount}/${total} correct (${acc}%)`, 'success');
    logActivity('xp_earned', '🧠', `Vocab endless review: ${correctCount}/${total} correct (${acc}%)`, `${endlessBatchCount + 1} batches`);
  };

  // Select the next batch of words for endless mode
  const selectNextEndlessBatch = (allowRecycle = false) => {
    const currentWords = useGameStore.getState().vocabWords;
    const todayStr = new Date().toISOString().split('T')[0];
    const reviewed = endlessReviewedIdsRef.current;
    const maxBatch = 10;

    const freshDue = currentWords.filter(w => w.nextReviewDate <= todayStr && !reviewed.has(w.id));
    const incorrectNames = new Set(endlessResultsRef.current.filter(r => !r.correct).map(r => r.word));
    const incorrectRetry = currentWords.filter(w => incorrectNames.has(w.word) && !reviewed.has(w.id));

    let batch: typeof currentWords;
    if (freshDue.length > 0) {
      const dueShuffled = shuffleArray(freshDue);
      const dueCount = Math.min(dueShuffled.length, Math.ceil(maxBatch * 0.7));
      const dueBatch = dueShuffled.slice(0, dueCount);
      const dueIds = new Set(dueBatch.map(w => w.id));
      const interleavePool = [
        ...incorrectRetry.filter(w => !dueIds.has(w.id)),
        ...currentWords.filter(w =>
          !dueIds.has(w.id) && !reviewed.has(w.id) &&
          (w.status === 'mastered' || w.status === 'reviewing') && w.totalReviews > 0
        ),
      ];
      const interleaveBatch = shuffleArray(interleavePool).slice(0, maxBatch - dueCount);
      batch = shuffleArray([...dueBatch, ...interleaveBatch]);
    } else if (incorrectRetry.length > 0) {
      batch = shuffleArray(incorrectRetry).slice(0, maxBatch);
    } else {
      const unseenPool = currentWords.filter(w => !reviewed.has(w.id) && w.totalReviews > 0);
      if (unseenPool.length > 0) {
        batch = shuffleArray(unseenPool).slice(0, maxBatch);
      } else if (allowRecycle) {
        endlessReviewedIdsRef.current = new Set();
        batch = shuffleArray([...currentWords]).slice(0, maxBatch);
      } else {
        batch = [];
      }
    }
    return { batch, currentWords };
  };

  // Generate quiz questions for a given word batch
  const generateQuizForBatch = async (batch: typeof vocabWords, allWords: typeof vocabWords) => {
    const res = await fetch('/api/vocab/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        words: batch.map(w => ({
          word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech,
          status: w.status, confidenceRating: w.confidenceRating,
          lastConfidenceCorrect: w.lastConfidenceCorrect,
          consecutiveFailures: w.consecutiveFailures || 0,
          failedQuizTypes: w.failedQuizTypes || [],
          totalReviews: w.totalReviews, etymology: w.etymology,
          relatedWords: w.relatedWords, antonym: w.antonym,
        })),
        allWords: allWords.map(w => ({
          word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech,
        })),
        ...(quizMode !== 'adaptive' ? { forcedType: quizMode } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    return data.questions?.length > 0 ? shuffleArray(data.questions) as QuizQuestion[] : null;
  };

  // Prefetch next batch in the background while user finishes current batch
  const prefetchNextBatch = async () => {
    if (prefetchInProgressRef.current) return;
    prefetchInProgressRef.current = true;
    try {
      const { batch, currentWords } = selectNextEndlessBatch(false);
      if (batch.length === 0) return;
      batch.forEach(w => endlessReviewedIdsRef.current.add(w.id));
      const nextQuestions = await generateQuizForBatch(batch, currentWords);
      if (nextQuestions) {
        prefetchedQuestionsRef.current = nextQuestions;
        prefetchedBatchRef.current = batch;
      }
    } catch {
      // Prefetch failed silently — will fall back to loading spinner
    }
  };

  const loadNextEndlessBatch = async () => {
    // Use prefetched data if available — seamless transition
    if (prefetchedQuestionsRef.current && prefetchedBatchRef.current) {
      const pQuestions = prefetchedQuestionsRef.current;
      const pBatch = prefetchedBatchRef.current;
      prefetchedQuestionsRef.current = null;
      prefetchedBatchRef.current = null;
      prefetchInProgressRef.current = false;

      setSessionResults([]);
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setShowHint(false);
      setStudyBatch(pBatch);
      setQuestions(pQuestions);
      setMode('quiz');
      setAnswerStartTime(Date.now());
      return;
    }

    // No prefetched data — fall back to loading with spinner
    setMode('loading');
    setSessionResults([]);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setShowHint(false);

    try {
      const { batch, currentWords } = selectNextEndlessBatch(true);
      if (batch.length === 0) {
        endEndlessSession();
        return;
      }
      batch.forEach(w => endlessReviewedIdsRef.current.add(w.id));
      setStudyBatch(batch);

      const nextQuestions = await generateQuizForBatch(batch, currentWords);
      if (nextQuestions) {
        setQuestions(nextQuestions);
        setMode('quiz');
        setAnswerStartTime(Date.now());
      } else {
        endEndlessSession();
      }
    } catch {
      addToast('Error loading next batch. Ending session.', 'error');
      endEndlessSession();
    }
  };

  const advanceQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setRecallInput('');
      setSpellingInput('');
      setSentenceInput('');
      setSentenceGrade(null);
      setShowHint(false);
      setAnswerStartTime(Date.now());

      // Prefetch next batch when nearing end of current batch (2nd-to-last question)
      if (isEndless && currentIdx + 1 >= questions.length - 2 && !prefetchInProgressRef.current && !prefetchedQuestionsRef.current) {
        prefetchNextBatch();
      }
    } else if (isEndless) {
      // Endless mode: update SM2 state and load the next batch
      checkVocabStreak();
      updateVocabLevel();
      setEndlessBatchCount(prev => prev + 1);
      loadNextEndlessBatch();
    } else {
      setMode('done');
      checkVocabStreak();
      updateVocabLevel();
      const correctCount = sessionResults.length > 0
        ? sessionResults.filter(r => r.correct).length + (selectedAnswer === questions[currentIdx]?.correctIndex ? 1 : 0)
        : 0;
      const acc = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      addToast(`Review complete! ${correctCount}/${questions.length} correct`, 'success');
      logActivity('xp_earned', '🧠', `Vocab review: ${correctCount}/${questions.length} correct (${acc}%)`, `WordForge review session`);
    }
  };

  // ── Quiz mode options ──
  const QUIZ_MODES: { type: QuizType | 'adaptive'; label: string; icon: string; color: string; desc: string }[] = [
    { type: 'adaptive', label: 'Adaptive', icon: '🧠', color: 'var(--color-blue)', desc: 'AI picks best type' },
    { type: 'multiple_choice', label: 'Definition', icon: '📝', color: 'var(--color-blue)', desc: 'Match word → meaning' },
    { type: 'reverse_choice', label: 'Word Match', icon: '🔄', color: 'var(--color-purple)', desc: 'Match meaning → word' },
    { type: 'fill_blank', label: 'Fill Blank', icon: '✏️', color: 'var(--color-orange)', desc: 'Complete sentences' },
    { type: 'synonym_match', label: 'Synonyms', icon: '🔗', color: 'var(--color-green)', desc: 'Find similar words' },
    { type: 'antonym_match', label: 'Antonyms', icon: '⚡', color: 'var(--color-red)', desc: 'Find opposites' },
    { type: 'etymology_drill', label: 'Etymology', icon: '📜', color: 'var(--color-orange)', desc: 'Word origins & roots' },
    { type: 'contextual_cloze', label: 'Context Cloze', icon: '📖', color: 'var(--color-green)', desc: 'Fill paragraph gaps' },
    { type: 'spelling_challenge', label: 'Spelling', icon: '✍️', color: 'var(--color-purple)', desc: 'Spell from definition' },
    { type: 'use_in_sentence', label: 'Usage', icon: '💬', color: 'var(--color-blue)', desc: 'Correct sentence usage' },
    { type: 'sentence_construction', label: 'Construct', icon: '🏗️', color: 'var(--color-green)', desc: 'Write your own sentence' },
    { type: 'paraphrase_challenge', label: 'Paraphrase', icon: '🔀', color: 'var(--color-purple)', desc: 'Rewrite using word' },
  ];

  const selectedModeName = quizMode === 'adaptive'
    ? 'Adaptive Quiz'
    : QUIZ_MODES.find(m => m.type === quizMode)?.label || 'Quiz';

  const handleQuizConfidence = (confidence: number) => {
    const q = questions[currentIdx];
    const wordObj = vocabWords.find(w => w.word === q?.word);
    if (wordObj) {
      setConfidenceRatings(prev => ({ ...prev, [wordObj.id]: confidence }));
      setWordConfidence(wordObj.id, confidence);
      // Update the last session result with confidence
      setSessionResults(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, confidence }];
      });
      if (isEndless && endlessResultsRef.current.length > 0) {
        const last = endlessResultsRef.current[endlessResultsRef.current.length - 1];
        endlessResultsRef.current[endlessResultsRef.current.length - 1] = { ...last, confidence };
      }
    }
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    advanceQuestion();
  };

  const handleModeStart = (modeType: QuizType | 'adaptive', quizType: 'quiz' | 'recall' = 'quiz') => {
    setQuizMode(modeType);
    startStudyCards(quizType);
  };

  const handleEndlessStart = () => {
    startStudyCards('quiz', true);
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

          {/* ── Learning Mode Selector ── */}
          <div className="pt-3 border-t border-[var(--color-border)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              <Layers size={10} /> Select Quiz Mode
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {QUIZ_MODES.map(m => (
                <button
                  key={m.type}
                  onClick={() => setQuizMode(m.type === quizMode ? 'adaptive' : m.type)}
                  className="p-1.5 rounded-md text-center transition-all border"
                  style={{
                    color: quizMode === m.type ? m.color : 'var(--color-text-secondary)',
                    background: quizMode === m.type ? `color-mix(in srgb, ${m.color} 12%, transparent)` : 'transparent',
                    borderColor: quizMode === m.type ? m.color : 'var(--color-border)',
                    opacity: quizMode === m.type ? 1 : 0.7,
                  }}
                  title={m.desc}
                >
                  <span className="block text-sm">{m.icon}</span>
                  <span className="block text-[9px] font-bold leading-tight mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Start Buttons ── */}
          <div className="flex gap-3">
            <button
              onClick={() => handleModeStart(quizMode, 'quiz')}
              disabled={dueWords.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-blue)] text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              <BarChart3 size={16} /> {selectedModeName}
            </button>
            <button
              onClick={() => handleModeStart('adaptive', 'recall')}
              disabled={dueWords.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-purple)] text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              <Brain size={16} /> Free Recall
            </button>
          </div>

          {/* Endless Study Mode */}
          {vocabWords.length > 0 && (
            <div className="mt-2">
              <button
                onClick={handleEndlessStart}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--color-orange)] text-white transition-all hover:brightness-110"
              >
                <Infinity size={16} /> Endless {selectedModeName}
              </button>
              <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-1">
                Quiz indefinitely — batches keep coming until you end the session
              </p>
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
          <Layers size={12} /> Study Cards — active recall before your {selectedModeName.toLowerCase()}
        </p>

        {/* Interactive Flashcard */}
        {card && (
          <AnimatePresence mode="wait">
            <motion.div
              key={studyCardIdx}
              initial={{ opacity: 0, rotateY: -10 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 10 }}
              transition={{ duration: 0.25 }}
              className="min-h-[200px] p-5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex flex-col justify-center"
            >
              {/* Front: word + active recall prompt */}
              {!studyCardFlipped ? (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-2xl font-bold text-white">{card.word}</p>
                    <p className="text-xs italic text-[var(--color-text-secondary)]">{card.partOfSpeech} &middot; {card.pronunciation}</p>
                  </div>

                  {/* Active recall prompt — user tries to recall before seeing answer */}
                  {!studyRecallSubmitted ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-purple)] font-bold flex items-center gap-1">
                        <Brain size={11} /> What do you think this word means?
                      </p>
                      <textarea
                        value={studyRecallInput}
                        onChange={e => setStudyRecallInput(e.target.value)}
                        placeholder="Try to recall the definition..."
                        className="w-full p-2.5 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-sm text-white resize-none focus:outline-none focus:border-[var(--color-purple)]"
                        rows={2}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setStudyRecallSubmitted(true);
                            setStudyCardFlipped(true);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setStudyRecallSubmitted(true); setStudyCardFlipped(true); }}
                          className="flex-1 py-2 rounded-lg text-xs font-bold bg-[var(--color-purple)] text-white hover:brightness-110 transition-all"
                        >
                          {studyRecallInput.trim() ? 'Check My Answer' : 'Reveal Definition'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setStudyCardFlipped(true)}
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                    >
                      Tap to see definition →
                    </button>
                  )}
                </div>
              ) : (
                /* Back: definition + recall comparison + mnemonic prompt */
                <div className="space-y-3">
                  <p className="text-lg font-bold text-white text-center">{card.word}</p>
                  <p className="text-sm text-[var(--color-text-primary)]">{card.definition}</p>

                  {/* Show user's recall attempt if they wrote one */}
                  {studyRecallInput.trim() && (
                    <div className="p-2.5 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                      <p className="text-[10px] uppercase font-bold text-[var(--color-blue)] mb-1">Your Recall</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{studyRecallInput}</p>
                    </div>
                  )}

                  {card.etymology && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      <span className="text-[var(--color-orange)] font-bold">Origin:</span> {card.etymology}
                    </p>
                  )}

                  {/* Example completion — show first few words, let user see the full example */}
                  {card.examples[0] && (
                    <div className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                      <p>&ldquo;{card.examples[0]}&rdquo;</p>
                    </div>
                  )}

                  {card.relatedWords && card.relatedWords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {card.relatedWords.map((rw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)]">{rw}</span>
                      ))}
                    </div>
                  )}

                  {/* Mnemonic creation prompt */}
                  {!studyMnemonicSaved && !card.userMnemonic && (
                    <div className="p-2.5 rounded-md bg-[var(--color-bg-hover)] border border-dashed border-[var(--color-green)]/40">
                      <p className="text-[10px] uppercase font-bold text-[var(--color-green)] mb-1.5 flex items-center gap-1">
                        <PenTool size={10} /> Create a memory trick
                      </p>
                      <input
                        value={studyMnemonicInput}
                        onChange={e => setStudyMnemonicInput(e.target.value)}
                        placeholder="Link it to something you know..."
                        className="w-full p-2 rounded text-xs bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-green)]"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && studyMnemonicInput.trim()) {
                            setUserMnemonic(card.id, studyMnemonicInput);
                            setStudyMnemonicSaved(true);
                          }
                        }}
                      />
                      {studyMnemonicInput.trim() && (
                        <button
                          onClick={() => { setUserMnemonic(card.id, studyMnemonicInput); setStudyMnemonicSaved(true); }}
                          className="mt-1.5 text-[10px] font-bold text-[var(--color-green)] hover:underline"
                        >
                          Save mnemonic
                        </button>
                      )}
                    </div>
                  )}
                  {(studyMnemonicSaved || card.userMnemonic) && (
                    <div className="p-2 rounded-md bg-[var(--color-green)]/10 border border-[var(--color-green)]/20">
                      <p className="text-[10px] font-bold text-[var(--color-green)]">Your Mnemonic:</p>
                      <p className="text-xs text-[var(--color-text-primary)]">{studyMnemonicInput || card.userMnemonic}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Confidence rating */}
        {card && studyCardFlipped && (
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
    const displayResults = isEndless ? endlessResultsRef.current : sessionResults;
    const correctCount = displayResults.filter(r => r.correct).length;
    const accuracy = displayResults.length > 0 ? Math.round((correctCount / displayResults.length) * 100) : 0;

    // Metacognitive insights: compare confidence vs actual correctness
    const hasConfidenceData = displayResults.some(r => r.confidence != null);
    const overconfidentWords = displayResults.filter(r => r.confidence != null && r.confidence >= 4 && !r.correct);
    const underconfidentWords = displayResults.filter(r => r.confidence != null && r.confidence <= 2 && r.correct);
    const calibratedWords = displayResults.filter(r => r.confidence != null && ((r.confidence >= 3 && r.correct) || (r.confidence <= 2 && !r.correct)));

    return (
      <div className="space-y-4">
        <div className="text-center py-8 p-6 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="text-4xl mb-3">{isEndless ? '♾️' : accuracy >= 80 ? '🏆' : accuracy >= 50 ? '💪' : '📖'}</div>
          <h3 className="text-lg font-bold mb-1">
            {isEndless ? 'Endless Session' : 'Session'} Complete!
          </h3>
          <p className="text-2xl font-bold mb-1" style={{ color: accuracy >= 80 ? 'var(--color-green)' : accuracy >= 50 ? 'var(--color-orange)' : 'var(--color-red)' }}>
            {accuracy}% Accuracy
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">{correctCount}/{displayResults.length} correct</p>
          {isEndless && (
            <p className="text-xs text-[var(--color-orange)] mt-1">
              {endlessBatchCount + 1} batches completed
            </p>
          )}
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

        <div className="space-y-1.5" style={{ maxHeight: displayResults.length > 20 ? '300px' : undefined, overflowY: displayResults.length > 20 ? 'auto' : undefined }}>
          {displayResults.map((r, i) => (
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

        <button
          onClick={() => { setMode('idle'); setIsEndless(false); }}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          Back to Review
        </button>
      </div>
    );
  }

  // ── Active quiz / recall ──
  const q = questions[currentIdx];
  const currentWord = vocabWords.find(w => w.word === q?.word);
  const progress = ((currentIdx + 1) / questions.length) * 100;

  // Type-specific labels and colors
  const typeLabels: Record<QuizType, { label: string; color: string }> = {
    multiple_choice: { label: 'Definition Match', color: 'var(--color-blue)' },
    reverse_choice: { label: 'Word From Definition', color: 'var(--color-purple)' },
    fill_blank: { label: 'Fill in the Blank', color: 'var(--color-orange)' },
    use_in_sentence: { label: 'Correct Usage', color: 'var(--color-green)' },
    free_recall: { label: 'Free Recall', color: 'var(--color-purple)' },
    synonym_match: { label: 'Synonym Match', color: 'var(--color-blue)' },
    antonym_match: { label: 'Antonym Match', color: 'var(--color-red)' },
    etymology_drill: { label: 'Etymology Drill', color: 'var(--color-orange)' },
    contextual_cloze: { label: 'Contextual Cloze', color: 'var(--color-green)' },
    spelling_challenge: { label: 'Spelling Challenge', color: 'var(--color-purple)' },
    sentence_construction: { label: 'Sentence Construction', color: 'var(--color-green)' },
    paraphrase_challenge: { label: 'Paraphrase Challenge', color: 'var(--color-purple)' },
  };

  const isOptionsType = mode === 'quiz' && q?.options && q.type !== 'spelling_challenge' && q.type !== 'sentence_construction' && q.type !== 'paraphrase_challenge';
  const isSpellingType = mode === 'quiz' && q?.type === 'spelling_challenge';
  const isSentenceType = mode === 'quiz' && (q?.type === 'sentence_construction' || q?.type === 'paraphrase_challenge');
  const typeInfo = q ? typeLabels[q.type] || { label: q.type.replace(/_/g, ' '), color: 'var(--color-blue)' } : null;

  // Format question text — highlight blanks for fill_blank / contextual_cloze
  const formatQuestion = (text: string, type: QuizType) => {
    if ((type === 'fill_blank' || type === 'contextual_cloze') && text.includes('___')) {
      const parts = text.split('___');
      return (
        <span>
          {parts[0]}
          <span className="px-2 py-0.5 mx-1 rounded bg-[var(--color-orange)]/20 border border-[var(--color-orange)]/40 text-[var(--color-orange)] font-mono">___</span>
          {parts.slice(1).join('___')}
        </span>
      );
    }
    return text;
  };

  return (
    <div className="space-y-4">
      {/* Endless session stats bar */}
      {isEndless && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--color-orange)]/10 border border-[var(--color-orange)]/20">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-orange)] flex items-center gap-1">
              <Infinity size={12} /> Endless
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              Batch {endlessBatchCount + 1} &middot; {endlessResultsRef.current.length} reviewed
              {endlessResultsRef.current.length > 0 && (
                <> &middot; {Math.round((endlessResultsRef.current.filter(r => r.correct).length / endlessResultsRef.current.length) * 100)}%</>
              )}
            </span>
          </div>
          <button
            onClick={endEndlessSession}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold text-[var(--color-red)] bg-[var(--color-red)]/10 border border-[var(--color-red)]/20 hover:bg-[var(--color-red)]/20 transition-colors"
          >
            <Square size={8} fill="currentColor" /> End Session
          </button>
        </div>
      )}

      {/* Progress bar + mode indicator */}
      <div className="flex items-center gap-3">
        {quizMode !== 'adaptive' && (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--color-purple)]/15 text-[var(--color-purple)]">
            {selectedModeName}
          </span>
        )}
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
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{
              background: `${typeInfo?.color}20`, color: typeInfo?.color,
            }}>
              {mode === 'recall' ? 'Free Recall' : typeInfo?.label}
            </span>
            {q?.type === 'spelling_challenge' && <PenTool size={12} className="text-[var(--color-purple)]" />}
            {(q?.type === 'fill_blank' || q?.type === 'contextual_cloze') && <Type size={12} className="text-[var(--color-orange)]" />}
            {q?.type === 'use_in_sentence' && <BookOpen size={12} className="text-[var(--color-green)]" />}
            {q?.type === 'sentence_construction' && <MessageSquare size={12} className="text-[var(--color-green)]" />}
            {q?.type === 'paraphrase_challenge' && <Repeat2 size={12} className="text-[var(--color-purple)]" />}
          </div>

          {/* Question text */}
          <p className="text-base font-bold text-white mb-4">
            {q ? formatQuestion(q.question, q.type) : ''}
          </p>

          {/* Hint */}
          {q?.hint && (
            <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-blue)] mb-3 transition-colors">
              <HelpCircle size={12} /> {showHint ? q.hint : 'Show hint'}
            </button>
          )}

          {/* ── Options-based quiz types (MC, reverse, fill_blank, use_in_sentence, synonym, antonym, etymology, cloze) ── */}
          {isOptionsType && (
            <div className="space-y-2">
              {q.options!.map((opt, i) => {
                let bg = 'var(--color-bg-hover)';
                let border = 'var(--color-border)';
                if (showAnswer) {
                  if (i === q.correctIndex) { bg = 'rgba(74,222,128,0.15)'; border = 'var(--color-green)'; }
                  else if (i === selectedAnswer && i !== q.correctIndex) { bg = 'rgba(248,113,113,0.15)'; border = 'var(--color-red)'; }
                } else if (i === selectedAnswer) {
                  bg = 'var(--color-bg-card)'; border = 'var(--color-blue)';
                }
                // Shorter options (word-level) get a compact grid layout
                const isWordOption = (q.type === 'reverse_choice' || q.type === 'fill_blank' || q.type === 'contextual_cloze'
                  || q.type === 'synonym_match' || q.type === 'antonym_match') && opt.split(' ').length <= 3;
                return (
                  <button
                    key={i}
                    onClick={() => handleMCAnswer(i)}
                    disabled={showAnswer}
                    className={`text-left rounded-md text-sm transition-all border ${
                      isWordOption ? 'inline-block mr-2 mb-1 px-4 py-2' : 'w-full p-3'
                    }`}
                    style={{ background: bg, borderColor: border }}
                  >
                    <span className="font-mono text-[var(--color-text-secondary)] mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}

              {showAnswer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-3 mt-2 border-t border-[var(--color-border)]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-[var(--color-text-muted)]">How was it?</span>
                    {[
                      { val: 1, label: 'Hard', color: 'var(--color-red)' },
                      { val: 3, label: 'OK', color: 'var(--color-blue)' },
                      { val: 5, label: 'Easy', color: 'var(--color-green)' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => handleQuizConfidence(opt.val)}
                        className="text-[10px] px-3 py-1 rounded border transition-all hover:brightness-110"
                        style={{
                          borderColor: opt.color,
                          color: opt.color,
                          background: `color-mix(in srgb, ${opt.color} 10%, transparent)`,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {selectedAnswer === q.correctIndex && (
                      <button
                        onClick={() => {
                          if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
                          advanceQuestion();
                        }}
                        className="ml-auto text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                      >
                        {currentIdx < questions.length - 1 ? 'Skip →' : 'Finish →'}
                      </button>
                    )}
                  </div>

                  {/* Quick definition flash — shown on correct answers */}
                  {selectedAnswer === q.correctIndex && currentWord && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 rounded-lg bg-[var(--color-green)]/5 border border-[var(--color-green)]/15 space-y-1"
                    >
                      <p className="text-xs font-bold text-white">{currentWord.word} <span className="font-normal text-[var(--color-text-muted)]">&middot; {currentWord.partOfSpeech}</span></p>
                      <p className="text-sm text-[var(--color-text-primary)]">{currentWord.definition}</p>
                    </motion.div>
                  )}

                  {/* Correction card — shown on wrong answers */}
                  {selectedAnswer !== q.correctIndex && currentWord && (
                    <div className="mt-2 p-3.5 rounded-lg bg-[var(--color-red)]/5 border border-[var(--color-red)]/15 space-y-2.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--color-red)] tracking-wider flex items-center gap-1">
                        <BookOpen size={11} /> Correct Answer
                      </p>
                      <div>
                        <p className="text-base font-bold text-white">{currentWord.word}</p>
                        <p className="text-[10px] italic text-[var(--color-text-muted)]">{currentWord.partOfSpeech} &middot; {currentWord.pronunciation}</p>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)]">{currentWord.definition}</p>
                      {currentWord.examples[0] && (
                        <div className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                          &ldquo;{currentWord.examples[0]}&rdquo;
                        </div>
                      )}
                      {currentWord.etymology && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          <span className="text-[var(--color-orange)] font-bold">Origin:</span> {currentWord.etymology}
                        </p>
                      )}
                      {(currentWord.userMnemonic || currentWord.mnemonic) && (
                        <div className="p-2 rounded bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                          <p className="text-[10px] uppercase font-bold text-[var(--color-purple)] mb-0.5">Memory Aid</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{currentWord.userMnemonic || currentWord.mnemonic}</p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
                          advanceQuestion();
                        }}
                        className="w-full mt-1 py-2 rounded-lg text-xs font-bold bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white hover:bg-[var(--color-bg-card)] transition-colors flex items-center justify-center gap-1"
                      >
                        Got it{currentIdx < questions.length - 1 ? ', next' : ', finish'} <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* ── Spelling challenge ── */}
          {isSpellingType && (
            <div className="space-y-3">
              {!showAnswer ? (
                <>
                  <input
                    value={spellingInput}
                    onChange={e => setSpellingInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && spellingInput.trim()) handleSpellingSubmit(); }}
                    placeholder="Type the word..."
                    autoFocus
                    className="w-full p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-lg text-white font-mono tracking-wider focus:outline-none focus:border-[var(--color-purple)]"
                  />
                  <button
                    onClick={handleSpellingSubmit}
                    disabled={!spellingInput.trim()}
                    className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-purple)] text-white hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    Check Spelling
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-green)] mb-1">Correct Spelling</p>
                    <p className="text-lg text-white font-mono tracking-wider">{q.correctSpelling || q.word}</p>
                  </div>
                  <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                    <p className="text-[10px] uppercase font-bold mb-1" style={{
                      color: spellingInput.toLowerCase().trim() === (q.correctSpelling || q.word).toLowerCase().trim()
                        ? 'var(--color-green)' : 'var(--color-red)',
                    }}>Your Answer</p>
                    <p className="text-lg font-mono tracking-wider" style={{
                      color: spellingInput.toLowerCase().trim() === (q.correctSpelling || q.word).toLowerCase().trim()
                        ? 'var(--color-green)' : 'var(--color-red)',
                    }}>{spellingInput}</p>
                  </div>

                  {/* Quick definition flash — shown on correct spelling */}
                  {spellingInput.toLowerCase().trim() === (q.correctSpelling || q.word).toLowerCase().trim() && currentWord && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-[var(--color-green)]/5 border border-[var(--color-green)]/15 space-y-1"
                    >
                      <p className="text-xs font-bold text-white">{currentWord.word} <span className="font-normal text-[var(--color-text-muted)]">&middot; {currentWord.partOfSpeech}</span></p>
                      <p className="text-sm text-[var(--color-text-primary)]">{currentWord.definition}</p>
                    </motion.div>
                  )}

                  {/* Correction card for wrong spelling */}
                  {spellingInput.toLowerCase().trim() !== (q.correctSpelling || q.word).toLowerCase().trim() && currentWord && (
                    <div className="p-3.5 rounded-lg bg-[var(--color-red)]/5 border border-[var(--color-red)]/15 space-y-2.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--color-red)] tracking-wider flex items-center gap-1">
                        <BookOpen size={11} /> Learn This Word
                      </p>
                      <p className="text-sm text-[var(--color-text-primary)]">{currentWord.definition}</p>
                      {currentWord.examples[0] && (
                        <div className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                          &ldquo;{currentWord.examples[0]}&rdquo;
                        </div>
                      )}
                      {currentWord.etymology && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          <span className="text-[var(--color-orange)] font-bold">Origin:</span> {currentWord.etymology}
                        </p>
                      )}
                      {(currentWord.userMnemonic || currentWord.mnemonic) && (
                        <div className="p-2 rounded bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                          <p className="text-[10px] uppercase font-bold text-[var(--color-purple)] mb-0.5">Memory Aid</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{currentWord.userMnemonic || currentWord.mnemonic}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-3 mt-1 border-t border-[var(--color-border)]/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)]">How was it?</span>
                      {[
                        { val: 1, label: 'Hard', color: 'var(--color-red)' },
                        { val: 3, label: 'OK', color: 'var(--color-blue)' },
                        { val: 5, label: 'Easy', color: 'var(--color-green)' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => handleQuizConfidence(opt.val)}
                          className="text-[10px] px-3 py-1 rounded border transition-all hover:brightness-110"
                          style={{
                            borderColor: opt.color,
                            color: opt.color,
                            background: `color-mix(in srgb, ${opt.color} 10%, transparent)`,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                      {spellingInput.toLowerCase().trim() === (q.correctSpelling || q.word).toLowerCase().trim() ? (
                        <button
                          onClick={() => {
                            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
                            advanceQuestion();
                          }}
                          className="ml-auto text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                        >
                          {currentIdx < questions.length - 1 ? 'Next →' : 'Finish →'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
                            advanceQuestion();
                          }}
                          className="ml-auto text-[10px] font-bold text-white px-3 py-1 rounded bg-[var(--color-bg-hover)] border border-[var(--color-border)] hover:bg-[var(--color-bg-card)] transition-colors flex items-center gap-1"
                        >
                          Got it <ArrowRight size={10} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          )}

          {/* ── Sentence Construction & Paraphrase Challenge ── */}
          {isSentenceType && (
            <div className="space-y-3">
              {/* Show original sentence for paraphrase */}
              {q.type === 'paraphrase_challenge' && q.originalSentence && (
                <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                  <p className="text-[10px] uppercase font-bold text-[var(--color-purple)] mb-1 flex items-center gap-1">
                    <Repeat2 size={10} /> Original Sentence
                  </p>
                  <p className="text-sm text-white italic">&ldquo;{q.originalSentence}&rdquo;</p>
                </div>
              )}

              {!showAnswer ? (
                <>
                  <textarea
                    value={sentenceInput}
                    onChange={e => setSentenceInput(e.target.value)}
                    placeholder={q.type === 'paraphrase_challenge'
                      ? `Rewrite the sentence above using "${q.word}"...`
                      : `Write a sentence using "${q.word}"...`}
                    autoFocus
                    className="w-full p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-sm text-white resize-none focus:outline-none focus:border-[var(--color-green)]"
                    rows={3}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && sentenceInput.trim()) {
                        e.preventDefault();
                        handleSentenceSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleSentenceSubmit}
                    disabled={!sentenceInput.trim() || sentenceGrading}
                    className="w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--color-green)] text-white hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {sentenceGrading ? (
                      <><RefreshCw size={14} className="animate-spin" /> Grading...</>
                    ) : (
                      <><MessageSquare size={14} /> Submit Sentence</>
                    )}
                  </button>
                </>
              ) : sentenceGrade && (
                <>
                  {/* Score display */}
                  <div className="p-4 rounded-lg border space-y-2" style={{
                    background: sentenceGrade.correct ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                    borderColor: sentenceGrade.correct ? 'var(--color-green)' : 'var(--color-red)',
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sentenceGrade.correct
                          ? <CheckCircle size={16} className="text-[var(--color-green)]" />
                          : <XCircle size={16} className="text-[var(--color-red)]" />}
                        <span className="text-sm font-bold" style={{ color: sentenceGrade.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
                          {sentenceGrade.score}/100
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[
                          { key: 'correctUsage', label: 'Usage', ok: sentenceGrade.correctUsage },
                          { key: 'grammar', label: 'Grammar', ok: sentenceGrade.grammar },
                          { key: 'naturalness', label: 'Natural', ok: sentenceGrade.naturalness },
                        ].map(c => (
                          <span key={c.key} className="text-[9px] px-1.5 py-0.5 rounded border" style={{
                            color: c.ok ? 'var(--color-green)' : 'var(--color-red)',
                            borderColor: c.ok ? 'var(--color-green)' : 'var(--color-red)',
                            background: c.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                          }}>
                            {c.ok ? '✓' : '✗'} {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)]">{sentenceGrade.feedback}</p>
                    {sentenceGrade.improvedVersion && (
                      <div className="pt-2 mt-2 border-t border-[var(--color-border)]/30">
                        <p className="text-[10px] uppercase font-bold text-[var(--color-blue)] mb-1">Improved Version</p>
                        <p className="text-xs text-[var(--color-text-secondary)] italic">&ldquo;{sentenceGrade.improvedVersion}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  {/* Your sentence */}
                  <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] mb-1">Your Sentence</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">&ldquo;{sentenceInput}&rdquo;</p>
                  </div>

                  {/* Definition reminder */}
                  {currentWord && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-[var(--color-green)]/5 border border-[var(--color-green)]/15 space-y-1"
                    >
                      <p className="text-xs font-bold text-white">{currentWord.word} <span className="font-normal text-[var(--color-text-muted)]">&middot; {currentWord.partOfSpeech}</span></p>
                      <p className="text-sm text-[var(--color-text-primary)]">{currentWord.definition}</p>
                    </motion.div>
                  )}

                  {/* Confidence + advance */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-3 mt-1 border-t border-[var(--color-border)]/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)]">How was it?</span>
                      {[
                        { val: 1, label: 'Hard', color: 'var(--color-red)' },
                        { val: 3, label: 'OK', color: 'var(--color-blue)' },
                        { val: 5, label: 'Easy', color: 'var(--color-green)' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => handleQuizConfidence(opt.val)}
                          className="text-[10px] px-3 py-1 rounded border transition-all hover:brightness-110"
                          style={{
                            borderColor: opt.color,
                            color: opt.color,
                            background: `color-mix(in srgb, ${opt.color} 10%, transparent)`,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
                          advanceQuestion();
                        }}
                        className="ml-auto text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                      >
                        {currentIdx < questions.length - 1 ? 'Next →' : 'Finish →'}
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          )}

          {/* ── Free recall mode ── */}
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
