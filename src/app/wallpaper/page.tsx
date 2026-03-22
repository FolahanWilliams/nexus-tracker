'use client';

import { useGameStore, DailyCalendarEntry } from '@/store/useGameStore';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function calcStreak(entries: DailyCalendarEntry[], todayStr: string): number {
  const completedSet = new Set(entries.filter(e => e.completed).map(e => e.date));
  let streak = 0;
  const [y, m, d] = todayStr.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  while (completedSet.has(toLocalDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Component ───────────────────────────────────────────────────

export default function WallpaperPage() {
  const { dailyCalendarEntries } = useGameStore();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand hydration from IndexedDB
  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // Already hydrated (e.g. navigated from within the app)
    if (useGameStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // Parse query params
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const theme = searchParams.get('theme') ?? 'dark'; // 'dark' | 'light'
  const accent = searchParams.get('accent') ?? '#4ade80'; // green default

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  // Build entry lookup
  const entryMap = useMemo(() => {
    const m: Record<string, DailyCalendarEntry> = {};
    dailyCalendarEntries.forEach(e => { m[e.date] = e; });
    return m;
  }, [dailyCalendarEntries]);

  // Earliest tracking date
  const trackingStart = useMemo(() => {
    if (dailyCalendarEntries.length === 0) return null;
    return dailyCalendarEntries.reduce(
      (earliest, e) => (e.date < earliest ? e.date : earliest),
      dailyCalendarEntries[0].date
    );
  }, [dailyCalendarEntries]);

  // Stats
  const completedCount = dailyCalendarEntries.filter(
    (e) => e.completed && e.date.startsWith(String(year))
  ).length;
  const streak = calcStreak(dailyCalendarEntries, todayStr);

  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const daysLeft = (year === today.getFullYear())
    ? (isLeapYear(year) ? 366 : 365) - dayOfYear
    : 0;
  const yearProgress = year === today.getFullYear()
    ? Math.round((dayOfYear / (isLeapYear(year) ? 366 : 365)) * 100)
    : (year < today.getFullYear() ? 100 : 0);

  // Theme colors
  const isDark = theme === 'dark';
  const bg = isDark ? '#000000' : '#ffffff';
  const textPrimary = isDark ? '#e5e5e5' : '#1a1a1a';
  const textSecondary = isDark ? '#737373' : '#737373';
  const dotDefault = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const dotCompleted = accent;
  const dotMissed = '#ef4444';
  const dotToday = '#f97316';

  if (!hydrated) {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: textSecondary, fontSize: 14, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: bg,
        minHeight: '100vh',
        padding: '40px 24px 32px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textPrimary,
        maxWidth: 460,
        margin: '0 auto',
      }}
    >
      {/* Year header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {year}
        </p>
        {year === today.getFullYear() && (
          <p style={{ fontSize: 13, color: textSecondary, marginTop: 8 }}>
            <span style={{ color: accent, fontWeight: 700 }}>{daysLeft}d left</span>
            {' · '}
            {yearProgress}%
            {streak > 0 && (
              <>
                {' · '}
                <span style={{ color: '#f97316', fontWeight: 700 }}>{streak}🔥</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* 12-month grid: 3 columns × 4 rows */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '28px 20px',
        }}
      >
        {Array.from({ length: 12 }, (_, monthIdx) => {
          const daysInMonth = getDaysInMonth(year, monthIdx);
          const firstDow = getFirstDayOfWeek(year, monthIdx);

          return (
            <div key={monthIdx}>
              {/* Month label */}
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: textSecondary,
                marginBottom: 6,
                letterSpacing: '0.01em',
              }}>
                {MONTH_NAMES[monthIdx]}
              </p>

              {/* Dot grid: 7 columns (Sun–Sat) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 3,
                }}
              >
                {/* Empty cells for offset */}
                {Array.from({ length: firstDow }, (_, i) => (
                  <div key={`empty-${i}`} style={{ width: 10, height: 10 }} />
                ))}

                {/* Day dots */}
                {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                  const day = dayIdx + 1;
                  const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const entry = entryMap[dateStr];
                  const isToday = dateStr === todayStr;
                  const isFuture = dateStr > todayStr;
                  const isBeforeTracking = trackingStart ? dateStr < trackingStart : true;

                  let dotColor = dotDefault;
                  if (isToday && !entry) {
                    dotColor = dotToday;
                  } else if (isFuture) {
                    dotColor = dotDefault;
                  } else if (entry?.completed) {
                    dotColor = dotCompleted;
                  } else if (entry && !entry.completed) {
                    dotColor = textSecondary;
                  } else if (!isBeforeTracking && !isFuture) {
                    // Missed day (after tracking started, no entry)
                    dotColor = dotMissed;
                  }
                  // else: untracked (before tracking started) — stays default dim

                  return (
                    <div
                      key={day}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        boxShadow: isToday
                          ? `0 0 6px ${dotToday}`
                          : entry?.completed
                            ? `0 0 3px ${accent}40`
                            : 'none',
                        transition: 'background-color 0.2s',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div style={{
        marginTop: 32,
        textAlign: 'center',
        fontSize: 12,
        color: textSecondary,
      }}>
        <span style={{ color: dotCompleted, fontWeight: 700 }}>{completedCount}</span> days showed up
        {streak > 0 && (
          <>
            {' · '}
            <span style={{ color: '#f97316', fontWeight: 700 }}>{streak}</span> day streak
          </>
        )}
      </div>
    </div>
  );
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
