'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ContributionHeatmapProps {
    dates: string[]; // ISO date strings e.g., '2023-10-25'
    color?: string; // CSS color variable like 'var(--color-green)'
}

/** Format a Date as YYYY-MM-DD without pulling in moment.js. */
function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function ContributionHeatmap({ dates, color = 'var(--color-green)' }: ContributionHeatmapProps) {
    // Activity map: date string (YYYY-MM-DD) -> count
    const activityMap = dates.reduce((acc, dateStr) => {
        // Only keep the YYYY-MM-DD part if time is included
        const day = dateStr.split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Determine the start date (12 weeks ago roughly 84 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 84);

    // Go back to align to Sunday
    while (startDate.getDay() !== 0) {
        startDate.setDate(startDate.getDate() - 1);
    }

    // Generate the weeks
    const weeks: { date: string; count: number }[][] = [];
    const currentDay = new Date(startDate);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);

    while (currentDay < endDate) {
        if (currentDay.getDay() === 0) {
            weeks.push([]);
        }
        const dayStr = formatDate(currentDay);
        const count = activityMap[dayStr] || 0;
        weeks[weeks.length - 1].push({ date: dayStr, count });
        currentDay.setDate(currentDay.getDate() + 1);
    }

    // Get max count for scaling color intensity
    const maxCount = Math.max(1, ...Object.values(activityMap));

    const getOpacity = (count: number) => {
        if (count === 0) return 0.1;
        return Math.max(0.3, Math.min(1, count / maxCount));
    };

    return (
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[var(--color-border)]">
            <div className="flex gap-1 min-w-max">
                {weeks.map((week, wIdx) => (
                    <div key={`week-${wIdx}`} className="flex flex-col gap-1">
                        {week.map((day, dIdx) => (
                            <motion.div
                                key={day.date}
                                className="w-3.5 h-3.5 rounded-sm bg-current"
                                style={{
                                    color: day.count > 0 ? color : 'var(--color-border)',
                                    opacity: getOpacity(day.count)
                                }}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: getOpacity(day.count), scale: 1 }}
                                transition={{ duration: 0.3, delay: (wIdx * 0.02) + (dIdx * 0.01) }}
                                title={`${day.date}: ${day.count} activities`}
                            />
                        ))}
                        {/* Fill remaining empty days in partial last week */}
                        {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-3.5 h-3.5 rounded-sm bg-transparent" />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-muted)] justify-end">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3.5 h-3.5 rounded-sm bg-[var(--color-border)]" style={{ opacity: 0.1 }} />
                    <div className="w-3.5 h-3.5 rounded-sm bg-current" style={{ color, opacity: 0.3 }} />
                    <div className="w-3.5 h-3.5 rounded-sm bg-current" style={{ color, opacity: 0.6 }} />
                    <div className="w-3.5 h-3.5 rounded-sm bg-current" style={{ color, opacity: 0.8 }} />
                    <div className="w-3.5 h-3.5 rounded-sm bg-current" style={{ color, opacity: 1.0 }} />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
