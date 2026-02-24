'use client';

import React from 'react';
import moment from 'moment';
import { motion } from 'framer-motion';

// This is a simplified contribution heatmap
// We will define an array of dates, and count occurrences

interface ContributionHeatmapProps {
    dates: string[]; // ISO date strings e.g., '2023-10-25'
    color?: string; // CSS color variable like 'var(--color-green)'
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
    const today = moment();
    const startDate = today.clone().subtract(84, 'days');

    // Let's go back 84 days + maybe a few to align to Sunday
    while (startDate.day() !== 0) {
        startDate.subtract(1, 'days');
    }

    // Generate the days
    const weeks: { date: string; count: number }[][] = [];
    const currentDay = startDate.clone();

    while (currentDay.isBefore(today.clone().add(1, 'days'))) {
        if (currentDay.day() === 0) {
            weeks.push([]);
        }
        const dayStr = currentDay.format('YYYY-MM-DD');
        const count = activityMap[dayStr] || 0;
        weeks[weeks.length - 1].push({ date: dayStr, count });
        currentDay.add(1, 'days');
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
