'use client';

import type { HitsDailySession } from '@/store/types';

const BLOCKS = [
    { key: 'A', label: 'Model Card', field: 'blockAComplete' },
    { key: 'B', label: 'Transfer Drill', field: 'blockBComplete' },
    { key: 'C', label: 'Output', field: 'blockCComplete' },
    { key: 'D', label: 'Reflection', field: 'blockDComplete' },
    { key: 'E', label: 'Recall Test', field: 'blockEComplete' },
] as const;

export default function BlockProgressBar({ session }: { session: HitsDailySession | null }) {
    const completedCount = session
        ? BLOCKS.filter((b) => session[b.field]).length
        : 0;

    return (
        <div className="flex items-center gap-1">
            {BLOCKS.map((block) => {
                const done = session ? session[block.field] : false;
                return (
                    <div key={block.key} className="flex flex-col items-center gap-1">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                done
                                    ? 'bg-[var(--color-green)] text-white'
                                    : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                            }`}
                        >
                            {block.key}
                        </div>
                        <span className="text-[9px] text-[var(--color-text-muted)] whitespace-nowrap">{block.label}</span>
                    </div>
                );
            })}
            <div className="ml-2 text-xs text-[var(--color-text-secondary)] font-semibold">
                {completedCount}/5
            </div>
        </div>
    );
}
