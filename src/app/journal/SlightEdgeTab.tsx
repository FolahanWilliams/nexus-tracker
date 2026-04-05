'use client';

import { useGameStore, DailyCalendarEntry, IdentityVote, BailEvent, IfThenPlan } from '@/store/useGameStore';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, TrendingUp,
  BookOpen, Lightbulb, X, Save, Flame, Trophy, Target, Zap,
  ShieldCheck, AlertTriangle, Sparkles, Plus,
  Play, Mail, CalendarDays as CalendarIcon, Send,
} from 'lucide-react';
import { useToastStore } from '@/components/ToastContainer';
import { useConceptExtraction } from '@/hooks/useConceptExtraction';
import { useAmbitionIngestion } from '@/hooks/useAmbitionIngestion';
import BailCaptureModal from '@/components/journal/BailCaptureModal';

// ─── Slight Edge quotes ───────────────────────────────────────────
const SLIGHT_EDGE_QUOTES = [
  "Every action you take is a vote for the person you want to become.",
  "Simple daily disciplines — done consistently over time — add up to the difference between success and failure.",
  "The difference between success and failure is not dramatic. It's the slight edge.",
  "You don't need to do something extraordinary. You need to do something ordinary, consistently.",
  "1.003 raised to the power of 365 equals 2.97 — your daily 0.3% improvement more than doubles you in a year.",
  "Show up when you don't feel like it. That's the slight edge.",
  "Success is the progressive realisation of a worthy ideal — done day by day.",
  "The magic of the slight edge is that every day you either get better or worse. There is no standing still.",
  "Your philosophy creates your attitude. Your attitude creates your actions. Actions create results.",
  "Easy to do. Easy not to do. That's the slight edge.",
];

// ─── Helpers ─────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function parseDateStrLocal(dateStr: string): Date {
  // Parse YYYY-MM-DD as local midnight — avoids UTC-offset shifting the date
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function calcStreak(entries: DailyCalendarEntry[], todayStr: string): number {
  const completedSet = new Set(entries.filter(e => e.completed).map(e => e.date));
  let streak = 0;
  const cursor = parseDateStrLocal(todayStr);
  while (completedSet.has(toLocalDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function calcBestStreak(entries: DailyCalendarEntry[]): number {
  const completedDates = entries.filter(e => e.completed).map(e => e.date).sort();
  if (completedDates.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prev = parseDateStrLocal(completedDates[i - 1]);
    const curr = parseDateStrLocal(completedDates[i]);
    const diffMs = curr.getTime() - prev.getTime();
    if (diffMs === 86400000) { // exactly 1 day apart
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

function getTrackingStartDate(entries: DailyCalendarEntry[]): string | null {
  if (entries.length === 0) return null;
  return entries.reduce((earliest, e) => e.date < earliest ? e.date : earliest, entries[0].date);
}

function calcCompoundGrowth(completedCount: number): number {
  // 1.003^n — represents 0.3% daily improvement
  return Math.pow(1.003, completedCount);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Akrasia helpers ─────────────────────────────────────────────
type ViewTab = 'calendar' | 'bails' | 'armor' | 'coach';

interface BailWithDate extends BailEvent {
  date: string;
}

function collectBails(entries: DailyCalendarEntry[]): BailWithDate[] {
  const out: BailWithDate[] = [];
  for (const e of entries) {
    if (e.bails) for (const b of e.bails) out.push({ ...b, date: e.date });
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function tallyVotes(votes: IdentityVote[]): { for: number; against: number; ratio: number } {
  const f = votes.filter(v => v.vote === 'for').length;
  const a = votes.filter(v => v.vote === 'against').length;
  return { for: f, against: a, ratio: f + a > 0 ? f / (f + a) : 0 };
}

// Hour-of-day heatmap bucketing (0-23) for bails view
function bucketBailsByHour(bails: BailWithDate[]): number[] {
  const buckets = new Array(24).fill(0);
  for (const b of bails) {
    const h = new Date(b.timestamp).getHours();
    buckets[h]++;
  }
  return buckets;
}

// ─── Component ───────────────────────────────────────────────────

export default function SlightEdgeTab() {
  const {
    dailyCalendarEntries, addOrUpdateCalendarEntry,
    uiCalendarYear, uiCalendarMonth, setUiCalendarPosition,
    identityLine, identityVotes, ifThenPlans,
    setIdentityLine, recordIdentityVote,
    updateMicroActionStatus,
    addIfThenPlan, fireIfThenPlan, breakIfThenPlan, toggleIfThenPlan, deleteIfThenPlan,
    completeOutreachBlock,
    knowledgeNodes, knowledgeEdges, startFocusTimer,
  } = useGameStore();
  const { addToast } = useToastStore();
  const { extractAndStore } = useConceptExtraction();
  const { ingestWantedDid } = useAmbitionIngestion();

  // ── View state ──
  const [view, setView] = useState<ViewTab>('calendar');
  const [bailModalOpen, setBailModalOpen] = useState(false);

  // ── Identity setup ──
  const [identitySetupOpen, setIdentitySetupOpen] = useState(false);
  const [identityDraft, setIdentityDraft] = useState('');
  const [identitySuggestions, setIdentitySuggestions] = useState<string[]>([]);
  const [identityLoading, setIdentityLoading] = useState(false);

  // ── Armor (if-then) state ──
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [armorSuggesting, setArmorSuggesting] = useState(false);

  // ── Coach tab state ──
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [sundayLetter, setSundayLetter] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateStr(today), [today]);

  const [viewYear, setViewYear] = useState(uiCalendarYear);
  const [viewMonth, setViewMonth] = useState(uiCalendarMonth);

  // Persist calendar position changes
  useEffect(() => {
    setUiCalendarPosition(viewYear, viewMonth);
  }, [viewYear, viewMonth, setUiCalendarPosition]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal form state
  const [formCompleted, setFormCompleted] = useState(false);
  const [formSummary, setFormSummary] = useState('');
  const [formLearned, setFormLearned] = useState('');
  const [formProductivity, setFormProductivity] = useState(5);
  const [formWanted, setFormWanted] = useState('');
  const [formDid, setFormDid] = useState('');
  const [gapIngesting, setGapIngesting] = useState(false);

  // ── Derived: identity tally, bails, ambition graph ──
  const voteTally = useMemo(() => tallyVotes(identityVotes), [identityVotes]);
  const allBails = useMemo(() => collectBails(dailyCalendarEntries), [dailyCalendarEntries]);
  const bailHourBuckets = useMemo(() => bucketBailsByHour(allBails), [allBails]);
  const maxBailHour = Math.max(1, ...bailHourBuckets);

  const ambitionNodes = useMemo(
    () => knowledgeNodes.filter((n) =>
      ['person', 'organization', 'accelerator', 'book', 'target'].includes(n.nodeType)
    ),
    [knowledgeNodes]
  );

  const counters = useMemo(() => {
    // Count unique entities by (nodeType, edgeType) via edges to anchor "status-*" nodes
    const anchors = new Map<string, string>();
    for (const n of ambitionNodes) {
      if (n.metadata && (n.metadata as { anchor?: boolean }).anchor) {
        anchors.set(n.id, (n.metadata as { edgeType?: string }).edgeType ?? n.label);
      }
    }
    const byEdge: Record<string, Set<string>> = {
      contacted: new Set(),
      wanted_to_contact: new Set(),
      read: new Set(),
      wanted_to_read: new Set(),
    };
    for (const e of knowledgeEdges) {
      if (anchors.has(e.targetNodeId) && byEdge[e.edgeType]) {
        byEdge[e.edgeType].add(e.sourceNodeId);
      }
    }
    return {
      contacted: byEdge.contacted.size,
      wantedToContact: byEdge.wanted_to_contact.size,
      read: byEdge.read.size,
      wantedToRead: byEdge.wanted_to_read.size,
    };
  }, [ambitionNodes, knowledgeEdges]);

  // Auto-record today's identity vote whenever today's entry or bails change
  const todayStrForVote = useMemo(() => toLocalDateStr(new Date()), []);
  useEffect(() => {
    if (!identityLine) return;
    const e = dailyCalendarEntries.find(x => x.date === todayStrForVote);
    if (!e) return;
    const microDone = e.microAction?.status === 'done';
    const bailCount = e.bails?.length ?? 0;
    const vote: 'for' | 'against' = microDone && bailCount === 0 ? 'for' : 'against';
    const reason = vote === 'for'
      ? 'Micro-action done, no bails'
      : bailCount > 0 ? `${bailCount} bail${bailCount > 1 ? 's' : ''}` : 'Micro-action not completed';
    const existing = identityVotes.find(v => v.date === todayStrForVote);
    if (!existing || existing.vote !== vote) {
      recordIdentityVote(todayStrForVote, vote, reason);
    }
  }, [identityLine, dailyCalendarEntries, identityVotes, recordIdentityVote, todayStrForVote]);

  // ── Coach actions ──
  const askCoach = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setCoachLoading(true);
    setCoachAnswer(null);
    try {
      const res = await fetch('/api/coach-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'query',
          question,
          identityLine,
          voteTally: { for: voteTally.for, against: voteTally.against },
          ambitionNodes: ambitionNodes.slice(0, 200).map(n => ({
            label: n.label,
            display: (n.metadata as { display?: string } | undefined)?.display,
            type: n.nodeType,
            mentionCount: n.mentionCount,
            lastSeenAt: n.lastSeenAt,
          })),
          ambitionEdges: knowledgeEdges
            .filter(e => ['contacted', 'wanted_to_contact', 'read', 'wanted_to_read', 'mentioned'].includes(e.edgeType))
            .slice(0, 400)
            .map(e => {
              const from = knowledgeNodes.find(n => n.id === e.sourceNodeId);
              const to = knowledgeNodes.find(n => n.id === e.targetNodeId);
              return { from: from?.label ?? e.sourceNodeId, to: to?.label ?? e.targetNodeId, type: e.edgeType };
            }),
          recentGaps: dailyCalendarEntries
            .filter(e => e.gapAnalysis)
            .slice(-14)
            .map(e => ({
              date: e.date,
              wanted: e.wanted ?? '',
              did: e.did ?? '',
              gapScore: e.gapAnalysis!.gapScore,
              missed: e.gapAnalysis!.missed,
              honored: e.gapAnalysis!.honored,
            })),
          recentBails: allBails.slice(0, 20).map(b => ({
            date: b.date, chose: b.chose, instead: b.instead, emotion: b.emotion,
          })),
        }),
      });
      const data = await res.json();
      setCoachAnswer(data.answer || data.error || 'No answer.');
    } catch {
      setCoachAnswer('Coach is offline right now.');
    } finally {
      setCoachLoading(false);
    }
  }, [identityLine, voteTally, ambitionNodes, knowledgeEdges, knowledgeNodes, dailyCalendarEntries, allBails]);

  const generateSundayLetter = useCallback(async () => {
    setLetterLoading(true);
    try {
      const res = await fetch('/api/coach-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'confront',
          identityLine,
          voteTally: { for: voteTally.for, against: voteTally.against },
          ambitionNodes: ambitionNodes.slice(0, 100).map(n => ({
            label: n.label,
            display: (n.metadata as { display?: string } | undefined)?.display,
            type: n.nodeType,
            mentionCount: n.mentionCount,
            lastSeenAt: n.lastSeenAt,
          })),
          recentGaps: dailyCalendarEntries
            .filter(e => e.gapAnalysis)
            .slice(-7)
            .map(e => ({
              date: e.date,
              wanted: e.wanted ?? '',
              did: e.did ?? '',
              gapScore: e.gapAnalysis!.gapScore,
              missed: e.gapAnalysis!.missed,
              honored: e.gapAnalysis!.honored,
            })),
          recentBails: allBails.slice(0, 20).map(b => ({
            date: b.date, chose: b.chose, instead: b.instead, emotion: b.emotion,
          })),
        }),
      });
      const data = await res.json();
      setSundayLetter(data.letter || null);
    } catch {
      setSundayLetter('Letter unavailable right now.');
    } finally {
      setLetterLoading(false);
    }
  }, [identityLine, voteTally, ambitionNodes, dailyCalendarEntries, allBails]);

  const draftIdentityHelp = useCallback(async () => {
    setIdentityLoading(true);
    try {
      const res = await fetch('/api/akrasia-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft_identity', vibes: identityDraft }),
      });
      const data = await res.json();
      if (Array.isArray(data.drafts)) setIdentitySuggestions(data.drafts);
    } finally {
      setIdentityLoading(false);
    }
  }, [identityDraft]);

  const suggestIfThen = useCallback(async () => {
    if (allBails.length === 0) {
      addToast('Log a few bails first — the coach needs pattern data.', 'info');
      return;
    }
    setArmorSuggesting(true);
    try {
      const res = await fetch('/api/akrasia-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_if_then',
          bails: allBails.slice(0, 20).map(b => ({
            chose: b.chose, instead: b.instead, emotion: b.emotion, trigger: b.trigger,
          })),
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        let added = 0;
        for (const s of data.suggestions) {
          if (s.trigger && s.response) {
            addIfThenPlan(s.trigger, s.response);
            added++;
          }
        }
        addToast(`Coach added ${added} if-then plan${added === 1 ? '' : 's'}.`, 'success');
      }
    } finally {
      setArmorSuggesting(false);
    }
  }, [allBails, addIfThenPlan, addToast]);

  // Quote of the day (deterministic by day-of-year)
  const quoteIndex = today.getDate() % SLIGHT_EDGE_QUOTES.length;
  const quote = SLIGHT_EDGE_QUOTES[quoteIndex];

  // Derived stats
  const entryMap = useMemo(() => {
    const m: Record<string, DailyCalendarEntry> = {};
    dailyCalendarEntries.forEach(e => { m[e.date] = e; });
    return m;
  }, [dailyCalendarEntries]);

  const completedCount = dailyCalendarEntries.filter(e => e.completed).length;
  const streak = calcStreak(dailyCalendarEntries, todayStr);
  const bestStreak = calcBestStreak(dailyCalendarEntries);
  const trackingStartDate = getTrackingStartDate(dailyCalendarEntries);
  const compoundMultiplier = calcCompoundGrowth(completedCount);
  const todayLogged = !!entryMap[todayStr];

  // Monthly completion rate for viewed month
  const monthCompletionStats = useMemo(() => {
    const daysInViewMonth = getDaysInMonth(viewYear, viewMonth);
    const todayDate = parseDateStrLocal(todayStr);
    const isCurrentMonth = viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();
    const totalDays = isCurrentMonth ? todayDate.getDate() : daysInViewMonth;
    let completed = 0;
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (entryMap[dateStr]?.completed) completed++;
    }
    return { completed, totalDays };
  }, [viewYear, viewMonth, entryMap, todayStr]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function openDay(dateStr: string) {
    const existing = entryMap[dateStr];
    setFormCompleted(existing?.completed ?? false);
    setFormSummary(existing?.summary ?? '');
    setFormLearned(existing?.learned ?? '');
    setFormProductivity(existing?.productivityScore ?? 5);
    // Prefill wanted from morning intention if not already set
    const morningIntention = useGameStore.getState().todayIntention;
    setFormWanted(existing?.wanted ?? (dateStr === todayStr ? morningIntention || '' : ''));
    setFormDid(existing?.did ?? existing?.summary ?? '');
    setSelectedDate(dateStr);
  }

  async function saveEntry() {
    if (!selectedDate) return;
    const effectiveDid = formDid.trim() || formSummary.trim();
    // Legacy summary field keeps working for existing consumers.
    addOrUpdateCalendarEntry(selectedDate, formCompleted, effectiveDid || formSummary, formLearned, formProductivity);

    // Gap capture — run entity extraction in the background
    if (formWanted.trim() || effectiveDid) {
      setGapIngesting(true);
      ingestWantedDid(selectedDate, formWanted, effectiveDid).finally(() => setGapIngesting(false));
    }

    if (formCompleted) {
      addToast('Day logged! Keep showing up. 🌱', 'success');
    } else {
      addToast('Entry saved. Tomorrow is a new chance.', 'info');
    }
    if (formLearned.trim()) {
      extractAndStore(formLearned, 'slight_edge', selectedDate, selectedDate);
    }
    setSelectedDate(null);
  }

  function getDayStatus(dateStr: string): 'completed' | 'missed' | 'logged' | 'future' | 'today' | 'untracked' {
    if (dateStr > todayStr) return 'future';
    if (dateStr === todayStr) {
      const e = entryMap[dateStr];
      if (!e) return 'today';
      return e.completed ? 'completed' : 'logged';
    }
    const e = entryMap[dateStr];
    if (!e) {
      // Days before the user started tracking are neutral, not missed
      if (!trackingStartDate || dateStr < trackingStartDate) return 'untracked';
      return 'missed';
    }
    return e.completed ? 'completed' : 'logged';
  }

  const statusStyles: Record<string, string> = {
    completed: 'bg-[var(--color-green)]/80 text-white border-[var(--color-green)]',
    missed:    'bg-red-900/30 text-red-400 border-red-800/50',
    logged:    'bg-[var(--color-blue)]/20 text-[var(--color-blue)] border-[var(--color-blue)]/40',
    future:    'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]/30',
    today:     'bg-[var(--color-orange)]/20 text-[var(--color-orange)] border-[var(--color-orange)] ring-1 ring-[var(--color-orange)]/50',
    untracked: 'bg-transparent text-[var(--color-text-muted)]/50 border-[var(--color-border)]/20',
  };

  return (
    <div className="space-y-6">
      {/* Streak indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Flame size={16} className="text-[var(--color-orange)]" />
        <span className="font-bold text-[var(--color-orange)]">{streak}</span>
        <span className="text-[var(--color-text-muted)]">day streak</span>
      </div>

        {/* Identity Line Banner (replaces rotating quote) */}
        <motion.div
          className="rpg-card border border-[var(--color-purple)]/30 bg-gradient-to-br from-[var(--color-purple)]/10 to-[var(--color-green)]/5"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🪞</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-purple)] mb-1">Identity Line</p>
              {identityLine ? (
                <>
                  <p className="text-sm text-[var(--color-text-primary)] font-semibold leading-relaxed">
                    &ldquo;{identityLine}&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-[var(--color-green)] font-bold tabular-nums">{voteTally.for} for</span>
                    <span className="text-[var(--color-text-muted)]">·</span>
                    <span className="text-red-400 font-bold tabular-nums">{voteTally.against} against</span>
                    <button
                      onClick={() => { setIdentityDraft(identityLine); setIdentitySetupOpen(true); }}
                      className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
                    >
                      edit
                    </button>
                  </div>
                  {voteTally.for + voteTally.against > 0 && (
                    <div className="mt-2 h-1.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[var(--color-green)] to-[var(--color-purple)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${voteTally.ratio * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--color-text-secondary)] italic mb-2">
                    Not &ldquo;be more productive.&rdquo; Write the exact sentence you&apos;re voting for every day. &ldquo;{quote}&rdquo;
                  </p>
                  <button
                    onClick={() => setIdentitySetupOpen(true)}
                    className="text-xs font-bold text-[var(--color-purple)] hover:text-[var(--color-purple-light,var(--color-purple))] underline underline-offset-2"
                  >
                    → Set your identity line
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* View Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto">
          {([
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'bails',    label: `Bails${allBails.length > 0 ? ` · ${allBails.length}` : ''}`, icon: AlertTriangle },
            { id: 'armor',    label: `Armor${ifThenPlans.length > 0 ? ` · ${ifThenPlans.length}` : ''}`, icon: ShieldCheck },
            { id: 'coach',    label: 'Coach', icon: Sparkles },
          ] as { id: ViewTab; label: string; icon: typeof Flame }[]).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  view === t.id
                    ? 'border-[var(--color-purple)] text-[var(--color-purple)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {view === 'calendar' && <>
        {/* Micro-Action pinned chip */}
        {(() => {
          const todayEntry = entryMap[todayStr];
          const micro = todayEntry?.microAction;
          if (!micro) return null;
          const statusColor = micro.status === 'done' ? 'green' : micro.status === 'bailed' ? 'red' : micro.status === 'skipped' ? 'orange' : 'purple';
          return (
            <motion.div
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`rpg-card border-2 border-[var(--color-${statusColor})] bg-[var(--color-${statusColor})]/10`}
            >
              <div className="flex items-start gap-3">
                <Zap size={18} className={`text-[var(--color-${statusColor})] flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                    Today&apos;s 2-minute move · {micro.status}
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{micro.text}</p>
                  {micro.bailReason && (
                    <p className="text-xs text-red-400 mt-1 italic">bailed: {micro.bailReason}</p>
                  )}
                </div>
              </div>
              {micro.status === 'pending' && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { updateMicroActionStatus(todayStr, 'done'); addToast('Micro-action done. +5 XP.', 'success'); }}
                    className="rpg-button btn-success text-xs py-1.5"
                  >
                    <CheckCircle2 size={12} /> Done
                  </button>
                  <button
                    onClick={() => updateMicroActionStatus(todayStr, 'skipped')}
                    className="rpg-button text-xs py-1.5"
                  >
                    Skipped
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('One line: what happened?') ?? '';
                      updateMicroActionStatus(todayStr, 'bailed', reason);
                    }}
                    className="rpg-button text-xs py-1.5 bg-red-600/70 hover:bg-red-600 text-white"
                  >
                    Bailed
                  </button>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* Energy-Locked Outreach Block */}
        {(() => {
          const todayEntry = entryMap[todayStr];
          const block = todayEntry?.outreachBlock;
          if (!block) return null;
          return (
            <motion.div
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`rpg-card border-2 ${block.completed ? 'border-[var(--color-green)] bg-[var(--color-green)]/10' : 'border-[var(--color-blue)] bg-[var(--color-blue)]/10'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Mail size={18} className={block.completed ? 'text-[var(--color-green)]' : 'text-[var(--color-blue)]'} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Outreach block</p>
                  <p className="text-sm font-semibold">
                    {block.startTime} · {block.durationMinutes} min · {block.completed ? 'Completed ✓' : 'Scheduled'}
                  </p>
                </div>
              </div>
              {block.stagedTemplate && !block.completed && (
                <div className="p-3 rounded bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {block.stagedTemplate}
                </div>
              )}
              {!block.completed && (
                <div className="mt-3 flex gap-2">
                  {block.stagedTemplate && (
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(block.stagedTemplate ?? '');
                        addToast('Template copied to clipboard.', 'success');
                      }}
                      className="rpg-button text-xs py-1.5 flex-1"
                    >
                      <Send size={12} /> Copy template
                    </button>
                  )}
                  <button
                    onClick={() => {
                      startFocusTimer('focus', block.durationMinutes * 60, null);
                      addToast('Focus timer started. Phone in another room.', 'success');
                    }}
                    className="rpg-button btn-primary text-xs py-1.5 flex-1"
                  >
                    <Play size={12} /> Start focus
                  </button>
                  <button
                    onClick={() => { completeOutreachBlock(todayStr); addToast('Block completed. +20 XP.', 'success'); }}
                    className="rpg-button btn-success text-xs py-1.5"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* Log Today CTA */}
        {!todayLogged && (
          <motion.button
            onClick={() => openDay(todayStr)}
            className="w-full rpg-card border-2 border-[var(--color-orange)]/50 bg-[var(--color-orange)]/10 hover:bg-[var(--color-orange)]/20 transition-colors cursor-pointer"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-[var(--color-orange)]">Log Today</p>
                  <p className="text-xs text-[var(--color-text-muted)]">You haven&apos;t logged today yet — tap to record your progress</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[var(--color-orange)] flex-shrink-0" />
            </div>
          </motion.button>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <p className="text-xl font-bold text-[var(--color-green)]">{completedCount}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Days Showed Up</p>
          </motion.div>
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-center gap-1">
              <Flame size={14} className="text-[var(--color-orange)]" />
              <p className="text-xl font-bold text-[var(--color-orange)]">{streak}</p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Current Streak</p>
          </motion.div>
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}>
            <div className="flex items-center justify-center gap-1">
              <Trophy size={14} className="text-[var(--color-yellow,#eab308)]" />
              <p className="text-xl font-bold text-[var(--color-yellow,#eab308)]">{bestStreak}</p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Best Streak</p>
          </motion.div>
          <motion.div className="rpg-card text-center !p-3" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-center gap-1">
              <Target size={14} className="text-[var(--color-purple)]" />
              <p className="text-xl font-bold text-[var(--color-purple)]">{monthCompletionStats.completed}/{monthCompletionStats.totalDays}</p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">This Month</p>
          </motion.div>
        </div>

        {/* Compound growth explanation */}
        {completedCount > 0 && (
          <motion.div
            className="rpg-card border border-[var(--color-purple)]/30 bg-[var(--color-purple)]/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-[var(--color-purple)] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  0.3% × {completedCount} days = {compoundMultiplier.toFixed(3)}× your baseline
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Showing up consistently compounds over time. At this rate, 365 days makes you ~3× better.
                </p>
              </div>
            </div>

            {/* Visual compound bar */}
            <div className="mt-3 h-2 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-green)]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (completedCount / 365) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-right">{completedCount}/365 days toward your 1-year compound</p>
          </motion.div>
        )}

        {/* Calendar */}
        <motion.div className="rpg-card" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-base">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
            <button
              onClick={nextMonth}
              disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
              className="p-1.5 rounded hover:bg-[var(--color-bg-dark)] text-[var(--color-text-secondary)] hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[var(--color-text-muted)] py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = getDayStatus(dateStr);
              const isDisabled = status === 'future' || status === 'untracked';
              const entry = entryMap[dateStr];

              return (
                <motion.button
                  key={dateStr}
                  onClick={() => !isDisabled && openDay(dateStr)}
                  disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.08 } : {}}
                  whileTap={!isDisabled ? { scale: 0.95 } : {}}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-all ${statusStyles[status]} ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                  title={entry ? (entry.summary || (entry.completed ? 'Completed' : 'Logged')) : dateStr}
                >
                  <span>{day}</span>
                  {status === 'completed' && <span className="text-[8px] leading-none mt-0.5">✓</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-[var(--color-border)]">
            {[
              { color: 'bg-[var(--color-green)]/80', label: 'Completed' },
              { color: 'bg-[var(--color-orange)]/20 border border-[var(--color-orange)]', label: 'Today' },
              { color: 'bg-[var(--color-blue)]/20 border border-[var(--color-blue)]/40', label: 'Logged (no ✓)' },
              { color: 'bg-red-900/30 border border-red-800/50', label: 'Missed' },
              { color: 'bg-transparent border border-[var(--color-border)]/20', label: 'Not tracked' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${item.color}`} />
                <span className="text-[10px] text-[var(--color-text-muted)]">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent entries */}
        {dailyCalendarEntries.length > 0 && (
          <motion.div className="rpg-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--color-blue)]" />
              Recent Journal Entries
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {[...dailyCalendarEntries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map(entry => (
                  <motion.button
                    key={entry.date}
                    onClick={() => openDay(entry.date)}
                    className="w-full text-left p-3 rounded-lg bg-[var(--color-bg-dark)] hover:bg-[var(--color-bg-hover)] transition-colors border border-[var(--color-border)] group"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {entry.completed
                        ? <CheckCircle2 size={14} className="text-[var(--color-green)] flex-shrink-0" />
                        : <Circle size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                      }
                      <span className="text-xs font-bold text-[var(--color-text-secondary)]">{entry.date}</span>
                      {entry.completed && (
                        <span className="text-[10px] text-[var(--color-green)] font-semibold ml-auto">+0.3% ✦</span>
                      )}
                    </div>
                    {entry.summary && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 pl-5">
                        <span className="font-medium text-[var(--color-text-muted)]">Did: </span>{entry.summary}
                      </p>
                    )}
                    {entry.learned && (
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 pl-5 mt-0.5">
                        <span className="font-medium">Learned: </span>{entry.learned}
                      </p>
                    )}
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}
        </>}

        {/* ─── BAILS VIEW ─── */}
        {view === 'bails' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-red-400" />
                <h3 className="font-bold text-sm">When you defect (hour of day)</h3>
                <span className="ml-auto text-xs text-[var(--color-text-muted)]">{allBails.length} total</span>
              </div>
              {allBails.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic py-6 text-center">
                  No bails logged yet. Tap the red button on the bottom-right when you catch yourself.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-1">
                    {bailHourBuckets.map((count, hr) => (
                      <div key={hr} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm bg-red-500/30 border border-red-900/50"
                          style={{ height: `${Math.max(6, (count / maxBailHour) * 60)}px`, opacity: count === 0 ? 0.15 : 0.4 + (count / maxBailHour) * 0.6 }}
                          title={`${hr}:00 — ${count} bails`}
                        />
                        <span className="text-[8px] text-[var(--color-text-muted)]">{hr}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-2 text-center">
                    Hour buckets · darker = more bails
                  </p>
                </>
              )}
            </div>

            {allBails.length > 0 && (
              <div className="rpg-card">
                <h3 className="font-bold text-sm mb-3">Recent bails</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {allBails.slice(0, 30).map(b => (
                    <div key={b.id} className="p-2.5 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-400 font-bold">{b.chose}</span>
                        <span className="text-[var(--color-text-muted)]">instead of</span>
                        <span className="text-[var(--color-green)] font-semibold">{b.instead}</span>
                        <span className="ml-auto text-[var(--color-text-muted)] text-[10px]">{b.date} · {new Date(b.timestamp).getHours()}:{String(new Date(b.timestamp).getMinutes()).padStart(2, '0')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-card)]">{b.emotion}</span>
                        {b.trigger && <span className="italic truncate">{b.trigger}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── ARMOR (IF-THEN) VIEW ─── */}
        {view === 'armor' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-[var(--color-green)]" />
                <h3 className="font-bold text-sm">If-Then Armor</h3>
                <button
                  onClick={suggestIfThen}
                  disabled={armorSuggesting}
                  className="ml-auto rpg-button text-xs py-1 px-3 disabled:opacity-50"
                >
                  {armorSuggesting ? 'Thinking…' : '✨ Suggest from bails'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-3 italic">
                Pre-commit your response to known triggers. Research shows if-then plans roughly double follow-through.
              </p>

              {/* Add form */}
              <div className="grid grid-cols-1 gap-2 p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] mb-3">
                <input
                  type="text"
                  value={newTrigger}
                  onChange={e => setNewTrigger(e.target.value)}
                  placeholder="When … (trigger)"
                  className="input-field text-sm"
                />
                <input
                  type="text"
                  value={newResponse}
                  onChange={e => setNewResponse(e.target.value)}
                  placeholder="Then I will … (response)"
                  className="input-field text-sm"
                />
                <button
                  onClick={() => {
                    if (newTrigger.trim() && newResponse.trim()) {
                      addIfThenPlan(newTrigger, newResponse);
                      setNewTrigger(''); setNewResponse('');
                      addToast('Armor added.', 'success');
                    }
                  }}
                  disabled={!newTrigger.trim() || !newResponse.trim()}
                  className="rpg-button btn-primary text-xs py-1.5 disabled:opacity-40"
                >
                  <Plus size={12} /> Add plan
                </button>
              </div>

              {/* Plans */}
              <div className="space-y-2">
                {ifThenPlans.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] italic py-6 text-center">
                    No plans yet. Write one above or tap &ldquo;Suggest from bails&rdquo; once you have bail data.
                  </p>
                ) : (
                  ifThenPlans.map((p: IfThenPlan) => (
                    <div key={p.id} className={`p-3 rounded-lg border text-xs ${p.active ? 'bg-[var(--color-bg-dark)] border-[var(--color-border)]' : 'bg-[var(--color-bg-dark)]/50 border-[var(--color-border)]/50 opacity-60'}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--color-text-secondary)]">
                            <span className="font-bold text-[var(--color-orange)]">IF</span> {p.trigger}
                          </p>
                          <p className="text-[var(--color-text-primary)] mt-1">
                            <span className="font-bold text-[var(--color-green)]">THEN</span> {p.response}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-muted)]">
                            <span className="text-[var(--color-green)]">✓ {p.timesFired}</span>
                            <span className="text-red-400">✗ {p.timesBroken}</span>
                            {p.timesBroken >= 3 && <span className="text-red-400 italic">broken 3× — reword?</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => fireIfThenPlan(p.id)} className="px-2 py-1 rounded bg-[var(--color-green)]/20 text-[var(--color-green)] hover:bg-[var(--color-green)]/30 text-[10px] font-bold">Used</button>
                          <button onClick={() => breakIfThenPlan(p.id)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[10px] font-bold">Broke</button>
                          <button onClick={() => toggleIfThenPlan(p.id)} className="px-2 py-1 rounded bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-[10px]">{p.active ? 'Off' : 'On'}</button>
                          <button onClick={() => deleteIfThenPlan(p.id)} className="px-2 py-1 rounded text-[var(--color-text-muted)] hover:text-red-400 text-[10px]"><X size={10} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── COACH VIEW ─── */}
        {view === 'coach' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Ambition counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rpg-card !p-3">
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">People reached</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)]">
                  <span className="text-[var(--color-green)]">{counters.contacted}</span>
                  <span className="text-[var(--color-text-muted)] text-sm"> / {counters.wantedToContact} wanted</span>
                </p>
              </div>
              <div className="rpg-card !p-3">
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Books read</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)]">
                  <span className="text-[var(--color-green)]">{counters.read}</span>
                  <span className="text-[var(--color-text-muted)] text-sm"> / {counters.wantedToRead} wanted</span>
                </p>
              </div>
            </div>

            {/* Ambition map (simple list view — links to /insights for full graph) */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-[var(--color-purple)]" />
                <h3 className="font-bold text-sm">Ambition map</h3>
                <span className="ml-auto text-xs text-[var(--color-text-muted)]">{ambitionNodes.filter(n => !(n.metadata as { anchor?: boolean } | undefined)?.anchor).length} nodes</span>
              </div>
              {ambitionNodes.filter(n => !(n.metadata as { anchor?: boolean } | undefined)?.anchor).length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic py-6 text-center">
                  Your ambition graph is empty. Log today&apos;s entry with specific names (&ldquo;Garry Tan&rdquo;, &ldquo;Zero to One&rdquo;) — the coach will extract and track them automatically.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {ambitionNodes
                    .filter(n => !(n.metadata as { anchor?: boolean } | undefined)?.anchor)
                    .sort((a, b) => b.mentionCount - a.mentionCount)
                    .slice(0, 40)
                    .map(n => {
                      // Determine if this node is honored or still pending
                      const outEdges = knowledgeEdges.filter(e => e.sourceNodeId === n.id);
                      const isDelivered = outEdges.some(e => e.edgeType === 'contacted' || e.edgeType === 'read');
                      const isWanted = outEdges.some(e => e.edgeType === 'wanted_to_contact' || e.edgeType === 'wanted_to_read');
                      const display = (n.metadata as { display?: string } | undefined)?.display || n.label;
                      return (
                        <div key={n.id} className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${isDelivered ? 'bg-[var(--color-green)]/10 border-[var(--color-green)]/30' : isWanted ? 'bg-red-900/20 border-red-900/50' : 'bg-[var(--color-bg-dark)] border-[var(--color-border)]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? 'bg-[var(--color-green)]' : isWanted ? 'bg-red-400' : 'bg-[var(--color-text-muted)]'}`} />
                          <span className="font-semibold truncate flex-1">{display}</span>
                          <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">{n.nodeType}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Ask the coach */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <Target size={18} className="text-[var(--color-orange)]" />
                <h3 className="font-bold text-sm">Ask the coach</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coachQuestion}
                  onChange={e => setCoachQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askCoach(coachQuestion)}
                  placeholder="Who did I say I'd email but never did?"
                  className="input-field text-sm flex-1"
                />
                <button
                  onClick={() => askCoach(coachQuestion)}
                  disabled={coachLoading || !coachQuestion.trim()}
                  className="rpg-button btn-primary text-xs px-3 disabled:opacity-40"
                >
                  {coachLoading ? '…' : 'Ask'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  'Who did I want to email but never did?',
                  'What books did I say I\'d read last month?',
                  'What\'s my biggest gap right now?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setCoachQuestion(q); askCoach(q); }}
                    className="text-[10px] px-2 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-purple)]/50"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {coachAnswer && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-purple)]/30 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                  {coachAnswer}
                </div>
              )}
            </div>

            {/* Sunday letter */}
            <div className="rpg-card">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={18} className="text-[var(--color-yellow,#eab308)]" />
                <h3 className="font-bold text-sm">Letter from your future self</h3>
                <button
                  onClick={generateSundayLetter}
                  disabled={letterLoading}
                  className="ml-auto rpg-button text-xs py-1 px-3 disabled:opacity-50"
                >
                  {letterLoading ? 'Writing…' : sundayLetter ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {sundayLetter ? (
                <div className="p-3 rounded-lg bg-gradient-to-br from-[var(--color-yellow,#eab308)]/10 to-[var(--color-purple)]/5 border border-[var(--color-yellow,#eab308)]/30 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap italic leading-relaxed">
                  {sundayLetter}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] italic py-4 text-center">
                  A 180-word letter from you, one year ahead, citing specific names and gaps from your graph. Uncompromising.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Floating "I bailed" button — only on calendar/bails views */}
        {(view === 'calendar' || view === 'bails') && (
          <button
            onClick={() => setBailModalOpen(true)}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-2xl border-2 border-red-400 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            title="I bailed — capture the moment"
            aria-label="Capture a bail"
          >
            <AlertTriangle size={22} />
          </button>
        )}

        <BailCaptureModal open={bailModalOpen} onClose={() => setBailModalOpen(false)} />

        {/* Identity setup modal */}
        <AnimatePresence>
          {identitySetupOpen && (
            <motion.div
              className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIdentitySetupOpen(false)}
            >
              <motion.div
                className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-purple)]/40 shadow-2xl overflow-hidden"
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
                  <h3 className="font-bold text-lg">Your identity line</h3>
                  <button onClick={() => setIdentitySetupOpen(false)} className="p-2 rounded-lg hover:bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]"><X size={18} /></button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    The sentence you vote for every day. Format: &ldquo;I&apos;m the kind of [role] who [specific behavior].&rdquo; Be concrete. Be uncompromising.
                  </p>
                  <textarea
                    value={identityDraft}
                    onChange={e => setIdentityDraft(e.target.value)}
                    placeholder="I'm the kind of founder who ships one outreach email before coffee."
                    className="input-field min-h-[80px] resize-none text-sm"
                    maxLength={280}
                  />
                  <button
                    onClick={draftIdentityHelp}
                    disabled={identityLoading}
                    className="rpg-button text-xs py-2 w-full disabled:opacity-50"
                  >
                    {identityLoading ? 'Drafting…' : '✨ Help me write this'}
                  </button>
                  {identitySuggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Pick one or edit:</p>
                      {identitySuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setIdentityDraft(s)}
                          className="w-full text-left p-3 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-sm hover:border-[var(--color-purple)]/50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5 flex gap-3">
                  <button onClick={() => setIdentitySetupOpen(false)} className="flex-1 rpg-button text-sm py-2.5">Cancel</button>
                  <button
                    onClick={() => {
                      setIdentityLine(identityDraft);
                      setIdentitySetupOpen(false);
                      setIdentitySuggestions([]);
                      addToast('Identity line set. Vote for it today.', 'success');
                    }}
                    disabled={!identityDraft.trim()}
                    className="flex-1 rpg-button btn-primary text-sm py-2.5 disabled:opacity-40"
                  >
                    Set identity
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Day Entry Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="font-bold text-lg">Daily Slight Edge Log</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">{selectedDate}</p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 rounded-lg hover:bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">

                {/* Did you show up? */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Did you do your goals today?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormCompleted(true)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${formCompleted
                        ? 'border-[var(--color-green)] bg-[var(--color-green)]/15 text-[var(--color-green)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-green)]/50'
                      }`}
                    >
                      <CheckCircle2 size={18} />
                      Yes, I showed up!
                    </button>
                    <button
                      onClick={() => setFormCompleted(false)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${!formCompleted
                        ? 'border-[var(--color-orange)] bg-[var(--color-orange)]/10 text-[var(--color-orange)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-orange)]/50'
                      }`}
                    >
                      <Circle size={18} />
                      Not today
                    </button>
                  </div>
                  {formCompleted && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-[var(--color-green)] mt-2 text-center font-medium"
                    >
                      🌱 Another +0.3% compounding. You&apos;re building your future self.
                    </motion.p>
                  )}
                </div>

                {/* Productivity Score */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Productivity Score</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={formProductivity}
                      onChange={e => setFormProductivity(Number(e.target.value))}
                      className="flex-1 accent-[var(--color-purple)] h-2"
                    />
                    <span className="text-2xl font-bold tabular-nums w-8 text-center" style={{
                      color: formProductivity <= 3 ? 'var(--color-red, #ef4444)'
                        : formProductivity <= 5 ? 'var(--color-orange)'
                        : formProductivity <= 7 ? 'var(--color-yellow, #eab308)'
                        : 'var(--color-green)',
                    }}>
                      {formProductivity}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1 px-0.5">
                    <span>Low</span>
                    <span>Average</span>
                    <span>Peak</span>
                  </div>
                </div>

                {/* Wanted vs Did (Gap Capture) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-purple)] mb-2">
                      <Target size={12} />
                      Wanted
                    </label>
                    <textarea
                      value={formWanted}
                      onChange={e => setFormWanted(e.target.value)}
                      placeholder="e.g., Email Garry Tan and Michael Seibel, read 20 pages of Zero to One"
                      className="input-field min-h-[80px] resize-none text-sm"
                      maxLength={2000}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-green)] mb-2">
                      <CheckCircle2 size={12} />
                      Did
                    </label>
                    <textarea
                      value={formDid}
                      onChange={e => { setFormDid(e.target.value); setFormSummary(e.target.value); }}
                      placeholder="Be honest. What actually happened?"
                      className="input-field min-h-[80px] resize-none text-sm"
                      maxLength={2000}
                    />
                  </div>
                </div>

                {/* Gap card — shown if prior gap analysis exists for this date */}
                {selectedDate && entryMap[selectedDate]?.gapAnalysis && (() => {
                  const gap = entryMap[selectedDate].gapAnalysis!;
                  const labelFor = (id: string) => {
                    const n = knowledgeNodes.find(kn => kn.id === id);
                    return (n?.metadata as { display?: string } | undefined)?.display || n?.label || id;
                  };
                  return (
                    <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Gap · {Math.round(gap.gapScore * 100)}%</span>
                      </div>
                      {gap.honored.length > 0 && (
                        <p className="text-xs text-[var(--color-green)] mb-1">
                          ✓ Honored: {gap.honored.map(labelFor).join(', ')}
                        </p>
                      )}
                      {gap.missed.length > 0 && (
                        <p className="text-xs text-red-400">
                          ✗ Missed: {gap.missed.map(labelFor).join(', ')}
                        </p>
                      )}
                      {gap.honored.length === 0 && gap.missed.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">No named ambition entities detected.</p>
                      )}
                    </div>
                  );
                })()}
                {gapIngesting && (
                  <p className="text-[10px] text-[var(--color-text-muted)] italic text-center">Extracting entities into your ambition graph…</p>
                )}

                {/* Learned */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                    <Lightbulb size={12} />
                    What did you learn?
                  </label>
                  <textarea
                    value={formLearned}
                    onChange={e => setFormLearned(e.target.value)}
                    placeholder="What insight, lesson, or new understanding did you gain today?"
                    className="input-field min-h-[80px] resize-none text-sm"
                    maxLength={1000}
                  />
                </div>

                {/* Slight Edge reminder */}
                <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] italic leading-relaxed">
                    💡 <strong className="text-[var(--color-text-secondary)]">Remember:</strong> The slight edge isn&apos;t about giant leaps. It&apos;s about small, consistent actions done repeatedly. Even a &ldquo;bad&rdquo; day where you reflect is better than silence.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={() => setSelectedDate(null)} className="flex-1 rpg-button text-sm py-2.5">
                  Cancel
                </button>
                <motion.button
                  onClick={saveEntry}
                  disabled={!formCompleted && !formSummary.trim() && !formLearned.trim()}
                  className="flex-1 rpg-button btn-success text-sm py-2.5 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Save size={15} />
                  Save Entry
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
