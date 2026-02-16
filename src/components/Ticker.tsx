
'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Ticker() {
    const items = [
        { label: 'SYSTEM ONLINE', value: 'ACTIVE', change: 'neutral' },
        { label: 'XP RATE', value: '+350/hr', change: 'up' },
        { label: 'FOCUS', value: '85%', change: 'up' },
        { label: 'STREAK', value: '5 DAYS', change: 'up' },
        { label: 'ENERGY', value: '92%', change: 'down' },
        { label: 'GOLD', value: '1,240', change: 'neutral' }
    ];

    return (
        <div className="w-full bg-[var(--bg-panel)] border-b border-[var(--border)] h-10 overflow-hidden flex items-center relative z-40">
            <div className="flex items-center gap-8 whitespace-nowrap animate-ticker pl-4">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[var(--text-secondary)] uppercase">{item.label}</span>
                        <span className={
                            item.change === 'up' ? 'text-[var(--accent-green)]' :
                                item.change === 'down' ? 'text-[var(--accent-red)]' :
                                    'text-[var(--text-primary)]'
                        }>
                            {item.value}
                        </span>
                        {item.change === 'up' && <TrendingUp size={12} className="text-[var(--accent-green)]" />}
                        {item.change === 'down' && <TrendingDown size={12} className="text-[var(--accent-red)]" />}
                    </div>
                ))}
                {/* Duplicate for seamless loop */}
                {items.map((item, i) => (
                    <div key={`dup-${i}`} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[var(--text-secondary)] uppercase">{item.label}</span>
                        <span className={
                            item.change === 'up' ? 'text-[var(--accent-green)]' :
                                item.change === 'down' ? 'text-[var(--accent-red)]' :
                                    'text-[var(--text-primary)]'
                        }>
                            {item.value}
                        </span>
                        {item.change === 'up' && <TrendingUp size={12} className="text-[var(--accent-green)]" />}
                        {item.change === 'down' && <TrendingDown size={12} className="text-[var(--accent-red)]" />}
                    </div>
                ))}
            </div>
        </div>
    );
}
