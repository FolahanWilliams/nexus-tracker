'use client';

import { HITS_PILLAR_LABELS, HITS_PILLAR_COLORS } from '@/lib/constants';
import type { KnowledgePillar } from '@/store/types';
import { Brain, TrendingUp, GitBranch, BarChart3, MessageSquare, Cpu, Sparkles } from 'lucide-react';

const PILLAR_ICONS: Record<KnowledgePillar, React.ReactNode> = {
    psychology: <Brain size={14} />,
    strategy: <TrendingUp size={14} />,
    systems: <GitBranch size={14} />,
    probability: <BarChart3 size={14} />,
    communication: <MessageSquare size={14} />,
    tech: <Cpu size={14} />,
    synthesis: <Sparkles size={14} />,
};

export default function PillarBadge({ pillar, size = 'md' }: { pillar: KnowledgePillar; size?: 'sm' | 'md' }) {
    const color = HITS_PILLAR_COLORS[pillar];
    const label = HITS_PILLAR_LABELS[pillar];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
            }`}
            style={{ backgroundColor: `${color}20`, color }}
        >
            {PILLAR_ICONS[pillar]}
            {label}
        </span>
    );
}
