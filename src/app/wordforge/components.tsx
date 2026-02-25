'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, Volume2, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Eye, EyeOff, Trash2, Brain,
  TrendingUp, Award, BookOpen, BarChart3, HelpCircle,
  Layers, PenLine, ThumbsUp, ThumbsDown, Minus, ArrowRight,
  GitBranch, Lightbulb,
} from 'lucide-react';
import { useGameStore, VocabWord, VocabDifficulty } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';

// ─── Shared helpers ──────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<VocabDifficulty, string> = {
  beginner: 'var(--color-green)',
  intermediate: 'var(--color-blue)',
  advanced: 'var(--color-purple)',
  expert: 'var(--color-orange)',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'NEW', color: 'var(--color-blue)' },
  learning: { label: 'LEARNING', color: 'var(--color-orange)' },
  reviewing: { label: 'REVIEWING', color: 'var(--color-purple)' },
  mastered: { label: 'MASTERED', color: 'var(--color-green)' },
};

// ─── DAILY WORDS TAB ─────────────────────────────────────────────
export function DailyWordsTab() {
  const {
    vocabWords, vocabDailyDate, vocabCurrentLevel,
    addVocabWords, setVocabDailyDate, logActivity, addXP,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todaysWords = vocabWords.filter(w => w.dateAdded === today);
  const alreadyGenerated = vocabDailyDate === today && todaysWords.length > 0;

  const fetchDailyWords = useCallback(async () => {
    setLoading(true);
    try {
      const existingWordList = vocabWords.map(w => w.word);
      const res = await fetch('/api/vocab/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLevel: vocabCurrentLevel,
          existingWords: existingWordList,
          count: 4,
        }),
      });
      const data = await res.json();
      if (data.words && data.words.length > 0) {
        addVocabWords(data.words);
        setVocabDailyDate(today);
        addXP(20);
        triggerXPFloat('+20 XP', '#4ade80');
        addToast(`${data.words.length} new words unlocked! +20 XP`, 'success');
        logActivity('xp_earned', '📚', `Generated ${data.words.length} new vocab words`, '+20 XP');
        if (data.isMock) addToast('Using sample words (no API key)', 'info');
      }
    } catch {
      addToast('Failed to generate words. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [vocabWords, vocabCurrentLevel, addVocabWords, setVocabDailyDate, today, addToast, addXP, logActivity]);

  return (
    <div className="space-y-4">
      {/* Level indicator + generate */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Current Level</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: DIFFICULTY_COLORS[vocabCurrentLevel] }} />
            <span className="text-sm font-bold capitalize">{vocabCurrentLevel}</span>
          </div>
        </div>
        <button
          onClick={fetchDailyWords}
          disabled={loading || alreadyGenerated}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
          style={{
            background: alreadyGenerated ? 'var(--color-bg-hover)' : 'var(--color-blue)',
            color: 'white',
          }}
        >
          {loading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {alreadyGenerated ? 'Words Delivered' : loading ? 'Generating...' : 'Generate Daily Words'}
        </button>
      </div>

      {/* Word cards */}
      {todaysWords.length === 0 && !loading && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No words yet today. Hit the button above to get started!</p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {todaysWords.map((word, i) => (
          <WordCard
            key={word.id}
            word={word}
            index={i}
            expanded={expandedId === word.id}
            onToggle={() => setExpandedId(expandedId === word.id ? null : word.id)}
          />
        ))}
      </AnimatePresence>

      {/* Previously learned words */}
      {vocabWords.length > todaysWords.length && (
        <PreviousWordsSection words={vocabWords.filter(w => w.dateAdded !== today)} />
      )}
    </div>
  );
}

function WordCard({ word, index, expanded, onToggle }: {
  word: VocabWord; index: number; expanded: boolean; onToggle: () => void;
}) {
  const { deleteVocabWord, setUserMnemonic } = useGameStore();
  const statusInfo = STATUS_LABELS[word.status] || STATUS_LABELS.new;
  const [showAIMnemonic, setShowAIMnemonic] = useState(false);
  const [userMnemonicInput, setUserMnemonicInput] = useState(word.userMnemonic || '');
  const [editingMnemonic, setEditingMnemonic] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden"
    >
      {/* Header */}
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-bold text-white">{word.word}</span>
          <span className="text-xs italic text-[var(--color-text-secondary)]">{word.partOfSpeech}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${DIFFICULTY_COLORS[word.difficulty]}20`, color: DIFFICULTY_COLORS[word.difficulty] }}>
            {word.difficulty}
          </span>
          {expanded ? <ChevronUp size={16} className="text-[var(--color-text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)] pt-3">
              {/* Pronunciation */}
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <Volume2 size={14} />
                <span className="font-mono">{word.pronunciation}</span>
              </div>

              {/* Definition */}
              <p className="text-sm text-[var(--color-text-primary)]">{word.definition}</p>

              {/* Etymology */}
              {word.etymology && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                  <GitBranch size={13} className="shrink-0 mt-0.5 text-[var(--color-orange)]" />
                  <span><span className="font-bold text-[var(--color-orange)]">Origin:</span> {word.etymology}</span>
                </div>
              )}

              {/* Related words + Antonym */}
              {(word.relatedWords?.length || word.antonym) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {word.relatedWords?.map((rw, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)] border border-[var(--color-blue)]/20">
                      {rw}
                    </span>
                  ))}
                  {word.antonym && word.antonym !== 'none' && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-red)]/10 text-[var(--color-red)] border border-[var(--color-red)]/20">
                      ≠ {word.antonym}
                    </span>
                  )}
                </div>
              )}

              {/* Examples */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">Examples</p>
                {word.examples.map((ex, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                    &ldquo;{ex}&rdquo;
                  </p>
                ))}
              </div>

              {/* User Mnemonic (active recall) */}
              <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-1.5 flex items-center gap-1">
                  <PenLine size={12} /> Your Memory Aid <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                </p>
                {editingMnemonic ? (
                  <div className="space-y-2">
                    <input
                      value={userMnemonicInput}
                      onChange={e => setUserMnemonicInput(e.target.value)}
                      placeholder="Create your own memory trick..."
                      className="w-full p-2 rounded text-xs bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-green)]"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setUserMnemonic(word.id, userMnemonicInput);
                          setEditingMnemonic(false);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setUserMnemonic(word.id, userMnemonicInput); setEditingMnemonic(false); }}
                        className="text-[10px] font-bold text-[var(--color-green)] hover:underline"
                      >Save</button>
                      <button
                        onClick={() => { setUserMnemonicInput(word.userMnemonic || ''); setEditingMnemonic(false); }}
                        className="text-[10px] text-[var(--color-text-muted)] hover:underline"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {word.userMnemonic ? (
                      <p className="text-xs text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-green)] transition-colors"
                        onClick={() => setEditingMnemonic(true)}>
                        {word.userMnemonic}
                      </p>
                    ) : (
                      <button
                        onClick={() => setEditingMnemonic(true)}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-green)] transition-colors italic"
                      >
                        + Write your own mnemonic (self-created aids stick better!)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* AI Mnemonic (reveal toggle) */}
              <div className="p-3 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <button
                  onClick={() => setShowAIMnemonic(!showAIMnemonic)}
                  className="w-full text-left text-[10px] uppercase font-bold text-[var(--color-purple)] tracking-wider flex items-center gap-1"
                >
                  <Brain size={12} /> AI Memory Aid
                  {showAIMnemonic ? <ChevronUp size={10} className="ml-auto" /> : <ChevronDown size={10} className="ml-auto" />}
                </button>
                {showAIMnemonic && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs text-[var(--color-text-primary)] mt-1.5"
                  >{word.mnemonic}</motion.p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)] pt-1">
                <span>Reviews: {word.totalReviews} | Correct: {word.correctReviews}</span>
                <span>Category: {word.category}</span>
              </div>
              {word.nextReviewDate && (
                <div className="text-[10px] text-[var(--color-text-muted)]">
                  Next review: {word.nextReviewDate === new Date().toISOString().split('T')[0] ? 'Today' : word.nextReviewDate}
                </div>
              )}

              <button
                onClick={() => deleteVocabWord(word.id)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors mt-1"
              >
                <Trash2 size={12} /> Remove word
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PreviousWordsSection({ words }: { words: VocabWord[] }) {
  const [showPrevious, setShowPrevious] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, VocabWord[]> = {};
    words.forEach(w => {
      (map[w.dateAdded] ??= []).push(w);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [words]);

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowPrevious(!showPrevious)}
        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
      >
        {showPrevious ? <EyeOff size={14} /> : <Eye size={14} />}
        {showPrevious ? 'Hide' : 'Show'} previous words ({words.length})
      </button>
      {showPrevious && (
        <div className="mt-3 space-y-4">
          {grouped.map(([date, dateWords]) => (
            <div key={date}>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2 font-bold">{date}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dateWords.map(w => {
                  const si = STATUS_LABELS[w.status] || STATUS_LABELS.new;
                  return (
                    <div key={w.id} className="p-2 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                      <p className="text-xs font-bold text-white">{w.word}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: si.color }}>{si.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── REVIEW SESSION TAB ──────────────────────────────────────────
interface QuizQuestion {
  word: string;
  type: 'multiple_choice' | 'reverse_choice' | 'fill_blank' | 'free_recall' | 'use_in_sentence';
  question: string;
  options?: string[];
  correctIndex?: number;
  hint: string;
}

export function ReviewTab() {
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
  const [studyBatch, setStudyBatch] = useState<VocabWord[]>([]);
  const [pendingQuizType, setPendingQuizType] = useState<'quiz' | 'recall'>('quiz');

  // Confidence tracking state
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, number>>({});

  const today = new Date().toISOString().split('T')[0];
  const dueWords = useMemo(
    () => vocabWords.filter(w => w.nextReviewDate <= today),
    [vocabWords, today]
  );

  const startStudyCards = useCallback((nextMode: 'quiz' | 'recall') => {
    if (dueWords.length === 0) {
      addToast('No words due for review!', 'info');
      return;
    }
    const batch = dueWords.slice(0, 10);
    setStudyBatch(batch);
    setStudyCardIdx(0);
    setStudyCardFlipped(false);
    setPendingQuizType(nextMode);
    setConfidenceRatings({});
    setMode('study');
  }, [dueWords, addToast]);

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

    const reviewBatch = dueWords.slice(0, 10);
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
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setMode('quiz');
      } else {
        addToast('Could not generate quiz. Try free recall instead.', 'error');
        setMode('idle');
      }
    } catch {
      addToast('Network error generating quiz.', 'error');
      setMode('idle');
    }
  }, [dueWords, vocabWords, addToast]);

  const launchFreeRecall = useCallback(() => {
    const batch = dueWords.slice(0, 10).map(w => ({
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
  }, [dueWords]);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMCAnswer = (optionIdx: number) => {
    if (showAnswer) return;
    setSelectedAnswer(optionIdx);
    setShowAnswer(true);
    const q = questions[currentIdx];
    const correct = optionIdx === q.correctIndex;
    const wordObj = vocabWords.find(w => w.word === q.word);
    if (wordObj) {
      const quality = correct ? 4 : 1;
      reviewVocabWord(wordObj.id, quality as 0 | 1 | 2 | 3 | 4 | 5);
    }
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    setSessionResults(prev => [...prev, { word: q.word, correct, confidence: conf }]);
    if (correct) {
      triggerXPFloat('+15 XP', '#4ade80');
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
    if (wordObj) {
      reviewVocabWord(wordObj.id, quality);
    }
    const correct = quality >= 3;
    const conf = wordObj ? confidenceRatings[wordObj.id] : undefined;
    setSessionResults(prev => [...prev, { word: q.word, correct, confidence: conf }]);
    if (correct) triggerXPFloat('+15 XP', '#4ade80');
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
          <Layers size={12} /> Study Cards — review before your quiz
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
          <h3 className="text-lg font-bold mb-1">Session Complete!</h3>
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

        <button
          onClick={() => setMode('idle')}
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


// ─── PROGRESS TAB ────────────────────────────────────────────────
export function ProgressTab() {
  const { vocabWords, vocabCurrentLevel, vocabStreak } = useGameStore();

  const stats = useMemo(() => {
    const total = vocabWords.length;
    const mastered = vocabWords.filter(w => w.status === 'mastered').length;
    const learning = vocabWords.filter(w => w.status === 'learning').length;
    const reviewing = vocabWords.filter(w => w.status === 'reviewing').length;
    const newW = vocabWords.filter(w => w.status === 'new').length;
    const totalReviews = vocabWords.reduce((s, w) => s + w.totalReviews, 0);
    const totalCorrect = vocabWords.reduce((s, w) => s + w.correctReviews, 0);
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    // Words by difficulty
    const byDiff: Record<string, number> = {};
    vocabWords.forEach(w => { byDiff[w.difficulty] = (byDiff[w.difficulty] || 0) + 1; });

    // Words by category
    const byCat: Record<string, number> = {};
    vocabWords.forEach(w => { byCat[w.category] = (byCat[w.category] || 0) + 1; });

    return { total, mastered, learning, reviewing, newW, totalReviews, accuracy, byDiff, byCat };
  }, [vocabWords]);

  return (
    <div className="space-y-4">
      {/* Main stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Words" value={stats.total} icon={<BookOpen size={16} />} color="var(--color-blue)" />
        <StatCard label="Mastered" value={stats.mastered} icon={<Award size={16} />} color="var(--color-green)" />
        <StatCard label="Accuracy" value={`${stats.accuracy}%`} icon={<TrendingUp size={16} />} color="var(--color-purple)" />
        <StatCard label="Vocab Streak" value={`${vocabStreak}d`} icon={<span className="text-sm">🔥</span>} color="var(--color-orange)" />
      </div>

      {/* Current level */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">AI Difficulty Level</p>
        <div className="flex items-center gap-3">
          {(['beginner', 'intermediate', 'advanced', 'expert'] as VocabDifficulty[]).map(level => (
            <div key={level} className="flex-1 text-center">
              <div
                className="h-2 rounded-full mb-1"
                style={{
                  background: level === vocabCurrentLevel ? DIFFICULTY_COLORS[level] : 'var(--color-bg-hover)',
                  boxShadow: level === vocabCurrentLevel ? `0 0 8px ${DIFFICULTY_COLORS[level]}40` : 'none',
                }}
              />
              <p className={`text-[10px] capitalize ${level === vocabCurrentLevel ? 'text-white font-bold' : 'text-[var(--color-text-muted)]'}`}>
                {level}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--color-text-secondary)] mt-2">
          Level auto-adjusts based on your review accuracy and mastery rate.
        </p>
      </div>

      {/* Status breakdown */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Word Status Breakdown</p>
        {stats.total === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No words yet. Generate your first batch!</p>
        ) : (
          <div className="space-y-2">
            <StatusBar label="New" count={stats.newW} total={stats.total} color="var(--color-blue)" />
            <StatusBar label="Learning" count={stats.learning} total={stats.total} color="var(--color-orange)" />
            <StatusBar label="Reviewing" count={stats.reviewing} total={stats.total} color="var(--color-purple)" />
            <StatusBar label="Mastered" count={stats.mastered} total={stats.total} color="var(--color-green)" />
          </div>
        )}
      </div>

      {/* Category distribution */}
      {Object.keys(stats.byCat).length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCat).sort(([,a], [,b]) => b - a).map(([cat, count]) => (
              <span key={cat} className="text-xs px-2 py-1 rounded bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Review stats */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Review Stats</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[var(--color-text-muted)] text-xs">Total Reviews</p>
            <p className="font-bold text-white">{stats.totalReviews}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-muted)] text-xs">Overall Accuracy</p>
            <p className="font-bold" style={{ color: stats.accuracy >= 70 ? 'var(--color-green)' : 'var(--color-orange)' }}>{stats.accuracy}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 text-[var(--color-text-secondary)]">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-hover)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right text-[var(--color-text-secondary)]">{count}</span>
    </div>
  );
}
