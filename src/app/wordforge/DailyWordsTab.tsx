'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, Volume2,
  ChevronDown, ChevronUp, Eye, EyeOff, Trash2, Brain,
  BookOpen, PenLine, GitBranch, Search, X, Filter,
} from 'lucide-react';
import { useGameStore, VocabWord } from '@/store/useGameStore';
import { logger } from '@/lib/logger';
import { useToastStore } from '@/components/ToastContainer';
import { triggerXPFloat } from '@/components/XPFloat';
import { DIFFICULTY_COLORS, STATUS_LABELS } from './shared';
import { VOCAB_DAILY_GENERATION_XP, VOCAB_DAILY_WORD_COUNT } from '@/lib/constants';

export default function DailyWordsTab() {
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
          count: VOCAB_DAILY_WORD_COUNT,
        }),
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.words && data.words.length > 0) {
        addVocabWords(data.words);
        setVocabDailyDate(today);
        addXP(VOCAB_DAILY_GENERATION_XP);
        triggerXPFloat(`+${VOCAB_DAILY_GENERATION_XP} XP`, '#4ade80');
        addToast(`${data.words.length} new words unlocked! +${VOCAB_DAILY_GENERATION_XP} XP`, 'success');
        logActivity('xp_earned', '📚', `Generated ${data.words.length} new vocab words`, `+${VOCAB_DAILY_GENERATION_XP} XP`);
        if (data.isMock) addToast('Using sample words (no API key)', 'info');
      } else {
        addToast('No words returned. Try again.', 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to generate vocab words: ${message}`, 'wordforge');
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
  const { deleteVocabWord, restoreVocabWord, setUserMnemonic } = useGameStore();
  const { addToast } = useToastStore();
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
                onClick={() => {
                  const backup = { ...word };
                  deleteVocabWord(word.id);
                  addToast(`"${word.word}" removed`, 'info', () => restoreVocabWord(backup));
                }}
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

// ─── Search / Filter Types ──────────────────────────────────────

type StatusFilter = 'all' | 'new' | 'learning' | 'reviewing' | 'mastered';
type CategoryFilter = string; // 'all' or specific category

function PreviousWordsSection({ words }: { words: VocabWord[] }) {
  const [showPrevious, setShowPrevious] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Derive available categories from the word list
  const categories = useMemo(() => {
    const cats = new Set(words.map(w => w.category));
    return Array.from(cats).sort();
  }, [words]);

  // Filter words by search + status + category
  const filteredWords = useMemo(() => {
    let result = words;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter(w => w.category === categoryFilter);
    }
    return result;
  }, [words, searchQuery, statusFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, VocabWord[]> = {};
    filteredWords.forEach(w => {
      (map[w.dateAdded] ??= []).push(w);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredWords]);

  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || categoryFilter !== 'all';

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
        <div className="mt-3 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search words or definitions..."
              className="w-full pl-9 pr-8 py-2 rounded-lg text-xs bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-blue)] placeholder:text-[var(--color-text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <Filter size={12} className="text-[var(--color-text-muted)]" />
            {/* Status filter chips */}
            {(['all', 'new', 'learning', 'reviewing', 'mastered'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="text-[10px] font-bold px-2 py-0.5 rounded transition-all border"
                style={{
                  background: statusFilter === s ? (s === 'all' ? 'var(--color-bg-card)' : `${STATUS_LABELS[s]?.color || 'var(--color-blue)'}20`) : 'transparent',
                  borderColor: statusFilter === s ? (s === 'all' ? 'var(--color-border)' : STATUS_LABELS[s]?.color || 'var(--color-border)') : 'var(--color-border)',
                  color: statusFilter === s ? (s === 'all' ? 'white' : STATUS_LABELS[s]?.color || 'white') : 'var(--color-text-muted)',
                }}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}

            {/* Category filter */}
            {categories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] focus:outline-none"
              >
                <option value="all">All categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors underline ml-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results count when filtering */}
          {hasActiveFilters && (
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {filteredWords.length} of {words.length} words
            </p>
          )}

          {/* Word list grouped by date */}
          <div className="space-y-4">
            {grouped.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No words match your filters.</p>
            )}
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
        </div>
      )}
    </div>
  );
}
