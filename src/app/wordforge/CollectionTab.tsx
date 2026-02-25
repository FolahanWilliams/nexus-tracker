'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Filter, Trash2, Calendar, ArrowUpDown,
  CheckSquare, Square, PenLine, Brain, ChevronDown, ChevronUp,
  Volume2, GitBranch,
} from 'lucide-react';
import { useGameStore, VocabWord, VocabDifficulty } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { DIFFICULTY_COLORS, STATUS_LABELS } from './shared';

type StatusFilter = 'all' | 'new' | 'learning' | 'reviewing' | 'mastered';
type SortField = 'dateAdded' | 'word' | 'status' | 'nextReviewDate' | 'accuracy';
type GroupBy = 'none' | 'category' | 'status' | 'difficulty' | 'dateAdded';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'word', label: 'Alphabetical' },
  { value: 'status', label: 'Status' },
  { value: 'nextReviewDate', label: 'Next Review' },
  { value: 'accuracy', label: 'Accuracy' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'dateAdded', label: 'Date Added' },
];

export default function CollectionTab() {
  const {
    vocabWords, restoreVocabWord,
    batchDeleteVocabWords, batchRescheduleVocabWords, batchSetVocabDifficulty,
  } = useGameStore();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortAsc, setSortAsc] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDifficulty, setShowBatchDifficulty] = useState(false);

  // Derive categories
  const categories = useMemo(() => {
    const cats = new Set(vocabWords.map(w => w.category));
    return Array.from(cats).sort();
  }, [vocabWords]);

  // Filter
  const filteredWords = useMemo(() => {
    let result = vocabWords;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter(w => w.category === categoryFilter);
    }
    return result;
  }, [vocabWords, searchQuery, statusFilter, categoryFilter]);

  // Sort
  const sortedWords = useMemo(() => {
    const sorted = [...filteredWords];
    const dir = sortAsc ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'word': return dir * a.word.localeCompare(b.word);
        case 'status': {
          const order = { new: 0, learning: 1, reviewing: 2, mastered: 3 };
          return dir * ((order[a.status] ?? 0) - (order[b.status] ?? 0));
        }
        case 'nextReviewDate': return dir * a.nextReviewDate.localeCompare(b.nextReviewDate);
        case 'accuracy': {
          const accA = a.totalReviews > 0 ? a.correctReviews / a.totalReviews : 0;
          const accB = b.totalReviews > 0 ? b.correctReviews / b.totalReviews : 0;
          return dir * (accA - accB);
        }
        default: return dir * a.dateAdded.localeCompare(b.dateAdded);
      }
    });
    return sorted;
  }, [filteredWords, sortField, sortAsc]);

  // Group
  const grouped = useMemo(() => {
    if (groupBy === 'none') return [['All Words', sortedWords] as [string, VocabWord[]]];
    const map: Record<string, VocabWord[]> = {};
    sortedWords.forEach(w => {
      const key = groupBy === 'category' ? w.category
        : groupBy === 'status' ? w.status
        : groupBy === 'difficulty' ? w.difficulty
        : w.dateAdded;
      (map[key] ??= []).push(w);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (groupBy === 'status') {
        const order = { new: 0, learning: 1, reviewing: 2, mastered: 3 };
        return (order[a as keyof typeof order] ?? 0) - (order[b as keyof typeof order] ?? 0);
      }
      if (groupBy === 'dateAdded') return b.localeCompare(a);
      return a.localeCompare(b);
    });
  }, [sortedWords, groupBy]);

  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || categoryFilter !== 'all';

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sortedWords.map(w => w.id)));
  }, [sortedWords]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setShowBatchDifficulty(false);
  }, []);

  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size;
    const backup = vocabWords.filter(w => selectedIds.has(w.id));
    batchDeleteVocabWords(Array.from(selectedIds));
    exitBatchMode();
    addToast(`${count} word${count !== 1 ? 's' : ''} deleted`, 'info', () => {
      backup.forEach(w => restoreVocabWord(w));
    });
  }, [selectedIds, vocabWords, batchDeleteVocabWords, restoreVocabWord, exitBatchMode, addToast]);

  const handleBatchReschedule = useCallback(() => {
    const count = selectedIds.size;
    batchRescheduleVocabWords(Array.from(selectedIds));
    exitBatchMode();
    addToast(`${count} word${count !== 1 ? 's' : ''} rescheduled to today`, 'success');
  }, [selectedIds, batchRescheduleVocabWords, exitBatchMode, addToast]);

  const handleBatchDifficulty = useCallback((difficulty: VocabDifficulty) => {
    const count = selectedIds.size;
    batchSetVocabDifficulty(Array.from(selectedIds), difficulty);
    exitBatchMode();
    addToast(`${count} word${count !== 1 ? 's' : ''} set to ${difficulty}`, 'success');
  }, [selectedIds, batchSetVocabDifficulty, exitBatchMode, addToast]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search words, definitions, or categories..."
          className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-blue)] placeholder:text-[var(--color-text-muted)]"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={12} className="text-[var(--color-text-muted)]" />
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
        {categories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}
            className="text-[10px] text-[var(--color-text-muted)] hover:text-white underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sort + Group + Batch controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <ArrowUpDown size={11} className="text-[var(--color-text-muted)]" />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] focus:outline-none"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white"
          >
            {sortAsc ? 'ASC' : 'DESC'}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">Group:</span>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as GroupBy)}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] focus:outline-none"
          >
            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="ml-auto">
          {batchMode ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-text-secondary)]">{selectedIds.size} selected</span>
              <button onClick={selectAll} className="text-[10px] text-[var(--color-blue)] hover:underline">All</button>
              <button onClick={clearSelection} className="text-[10px] text-[var(--color-text-muted)] hover:underline">None</button>
              <button onClick={exitBatchMode} className="text-[10px] text-[var(--color-text-muted)] hover:underline">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setBatchMode(true)}
              className="text-[10px] font-bold px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-purple)]/40 transition-colors"
            >
              Batch Edit
            </button>
          )}
        </div>
      </div>

      {/* Batch action bar */}
      <AnimatePresence>
        {batchMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-lg bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/30 space-y-2"
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded bg-[var(--color-red)]/15 text-[var(--color-red)] border border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/25 transition-colors"
              >
                <Trash2 size={11} /> Delete ({selectedIds.size})
              </button>
              <button
                onClick={handleBatchReschedule}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded bg-[var(--color-blue)]/15 text-[var(--color-blue)] border border-[var(--color-blue)]/30 hover:bg-[var(--color-blue)]/25 transition-colors"
              >
                <Calendar size={11} /> Reschedule to Today
              </button>
              <button
                onClick={() => setShowBatchDifficulty(!showBatchDifficulty)}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded bg-[var(--color-orange)]/15 text-[var(--color-orange)] border border-[var(--color-orange)]/30 hover:bg-[var(--color-orange)]/25 transition-colors"
              >
                <ArrowUpDown size={11} /> Change Difficulty
              </button>
            </div>
            {showBatchDifficulty && (
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced', 'expert'] as VocabDifficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => handleBatchDifficulty(d)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded border capitalize"
                    style={{ borderColor: DIFFICULTY_COLORS[d], color: DIFFICULTY_COLORS[d], background: `${DIFFICULTY_COLORS[d]}15` }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <p className="text-[10px] text-[var(--color-text-muted)]">
        {filteredWords.length} of {vocabWords.length} words
      </p>

      {/* Word list */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{vocabWords.length === 0 ? 'No words yet. Generate your first batch in the Daily Words tab!' : 'No words match your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([groupLabel, words]) => (
            <div key={groupLabel}>
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold capitalize" style={{
                    color: groupBy === 'status' ? (STATUS_LABELS[groupLabel]?.color || 'white')
                      : groupBy === 'difficulty' ? (DIFFICULTY_COLORS[groupLabel as VocabDifficulty] || 'white')
                      : 'var(--color-text-secondary)',
                  }}>
                    {groupLabel}
                  </p>
                  <span className="text-[10px] text-[var(--color-text-muted)]">({words.length})</span>
                </div>
              )}
              <div className="space-y-1.5">
                {words.map(word => (
                  <CollectionWordCard
                    key={word.id}
                    word={word}
                    expanded={expandedId === word.id}
                    onToggle={() => setExpandedId(expandedId === word.id ? null : word.id)}
                    batchMode={batchMode}
                    selected={selectedIds.has(word.id)}
                    onSelect={() => toggleSelect(word.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionWordCard({ word, expanded, onToggle, batchMode, selected, onSelect }: {
  word: VocabWord; expanded: boolean; onToggle: () => void;
  batchMode: boolean; selected: boolean; onSelect: () => void;
}) {
  const { deleteVocabWord, restoreVocabWord, setUserMnemonic } = useGameStore();
  const { addToast } = useToastStore();
  const statusInfo = STATUS_LABELS[word.status] || STATUS_LABELS.new;
  const [editingMnemonic, setEditingMnemonic] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState(word.userMnemonic || '');
  const [showAIMnemonic, setShowAIMnemonic] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const accuracy = word.totalReviews > 0 ? Math.round((word.correctReviews / word.totalReviews) * 100) : null;
  const isDue = word.nextReviewDate <= today;

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      selected ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/5' : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {batchMode && (
          <button onClick={onSelect} className="shrink-0">
            {selected
              ? <CheckSquare size={16} className="text-[var(--color-purple)]" />
              : <Square size={16} className="text-[var(--color-text-muted)]" />
            }
          </button>
        )}
        <button onClick={onToggle} className="flex-1 text-left flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-white truncate">{word.word}</span>
          <span className="text-[10px] italic text-[var(--color-text-secondary)] shrink-0">{word.partOfSpeech}</span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {isDue && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-orange)]/15 text-[var(--color-orange)]">DUE</span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
            style={{ background: `${statusInfo.color}15`, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
            style={{ background: `${DIFFICULTY_COLORS[word.difficulty]}15`, color: DIFFICULTY_COLORS[word.difficulty] }}>
            {word.difficulty}
          </span>
          {accuracy !== null && (
            <span className="text-[9px] font-mono"
              style={{ color: accuracy >= 70 ? 'var(--color-green)' : accuracy >= 40 ? 'var(--color-orange)' : 'var(--color-red)' }}>
              {accuracy}%
            </span>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)]">{word.category}</span>
          {expanded ? <ChevronUp size={14} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)]" />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5 border-t border-[var(--color-border)] pt-2.5">
              {/* Pronunciation */}
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <Volume2 size={13} />
                <span className="font-mono">{word.pronunciation}</span>
              </div>

              {/* Definition */}
              <p className="text-sm text-[var(--color-text-primary)]">{word.definition}</p>

              {/* Etymology */}
              {word.etymology && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                  <GitBranch size={12} className="shrink-0 mt-0.5 text-[var(--color-orange)]" />
                  <span><span className="font-bold text-[var(--color-orange)]">Origin:</span> {word.etymology}</span>
                </div>
              )}

              {/* Related words + Antonym */}
              {(word.relatedWords?.length || word.antonym) && (
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  {word.relatedWords?.map((rw, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)] border border-[var(--color-blue)]/20">{rw}</span>
                  ))}
                  {word.antonym && word.antonym !== 'none' && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-red)]/10 text-[var(--color-red)] border border-[var(--color-red)]/20">
                      ≠ {word.antonym}
                    </span>
                  )}
                </div>
              )}

              {/* Examples */}
              {word.examples.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">Examples</p>
                  {word.examples.map((ex, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-2.5 border-l-2 border-[var(--color-border)]">&ldquo;{ex}&rdquo;</p>
                  ))}
                </div>
              )}

              {/* User Mnemonic */}
              <div className="p-2.5 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <p className="text-[10px] uppercase font-bold text-[var(--color-green)] tracking-wider mb-1 flex items-center gap-1">
                  <PenLine size={11} /> Your Memory Aid
                </p>
                {editingMnemonic ? (
                  <div className="space-y-1.5">
                    <input
                      value={mnemonicInput}
                      onChange={e => setMnemonicInput(e.target.value)}
                      placeholder="Create your own memory trick..."
                      className="w-full p-1.5 rounded text-xs bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-green)]"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') { setUserMnemonic(word.id, mnemonicInput); setEditingMnemonic(false); }
                        if (e.key === 'Escape') { setMnemonicInput(word.userMnemonic || ''); setEditingMnemonic(false); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setUserMnemonic(word.id, mnemonicInput); setEditingMnemonic(false); }} className="text-[10px] font-bold text-[var(--color-green)] hover:underline">Save</button>
                      <button onClick={() => { setMnemonicInput(word.userMnemonic || ''); setEditingMnemonic(false); }} className="text-[10px] text-[var(--color-text-muted)] hover:underline">Cancel</button>
                    </div>
                  </div>
                ) : word.userMnemonic ? (
                  <p className="text-xs text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-green)] transition-colors" onClick={() => setEditingMnemonic(true)}>
                    {word.userMnemonic}
                  </p>
                ) : (
                  <button onClick={() => setEditingMnemonic(true)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-green)] transition-colors italic">
                    + Write your own mnemonic
                  </button>
                )}
              </div>

              {/* AI Mnemonic */}
              <div className="p-2.5 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <button onClick={() => setShowAIMnemonic(!showAIMnemonic)} className="w-full text-left text-[10px] uppercase font-bold text-[var(--color-purple)] tracking-wider flex items-center gap-1">
                  <Brain size={11} /> AI Memory Aid
                  {showAIMnemonic ? <ChevronUp size={10} className="ml-auto" /> : <ChevronDown size={10} className="ml-auto" />}
                </button>
                {showAIMnemonic && <p className="text-xs text-[var(--color-text-primary)] mt-1">{word.mnemonic}</p>}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
                <span>Reviews: {word.totalReviews} | Correct: {word.correctReviews}{accuracy !== null ? ` (${accuracy}%)` : ''}</span>
                <span>Added: {word.dateAdded}</span>
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                Next review: {word.nextReviewDate === today ? 'Today' : word.nextReviewDate}
              </div>

              {/* Delete */}
              <button
                onClick={() => {
                  const backup = { ...word };
                  deleteVocabWord(word.id);
                  addToast(`"${word.word}" removed`, 'info', () => restoreVocabWord(backup));
                }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
