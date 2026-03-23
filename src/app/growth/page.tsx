'use client';

import { useGameStore } from '@/store/useGameStore';
import type { DailyGrowthNode, DailyCalendarEntry } from '@/store/useGameStore';
import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    ChevronLeft, Calendar, Loader2, RefreshCw, Network,
    Maximize2, Minimize2, BarChart3, GitBranch, Layers,
    TrendingUp, Flame, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

function getScoreColor(score: number): string {
    if (score >= 8) return '#4ade80';
    if (score >= 6) return '#a3e635';
    if (score >= 4) return '#fbbf24';
    if (score >= 2) return '#fb923c';
    return '#ef4444';
}

function getScoreGradient(score: number): string {
    // Returns a darker version for the inner ring
    if (score >= 8) return '#166534';
    if (score >= 6) return '#3f6212';
    if (score >= 4) return '#713f12';
    if (score >= 2) return '#7c2d12';
    return '#7f1d1d';
}

interface DayGraphNode {
    id: string;
    label: string;
    logDate: string;
    score: number;
    color: string;
    size: number;
    conceptsLearned: string[];
    habitsCompleted: string[];
    questsCompleted: number;
    wordsReviewed: number;
    focusMinutes: number;
    logSummary: string;
    isStreak: boolean;
    x?: number;
    y?: number;
}

interface DayGraphLink {
    source: string;
    target: string;
    type: string;
    weight: number;
}

export default function GrowthPage() {
    const {
        dailyCalendarEntries, habits, tasks, focusSessionsTotal,
        vocabWords, dailyGrowthNodes, upsertDailyGrowthNode,
        setKnowledgeLoading, knowledgeLoading,
    } = useGameStore();

    const [viewMode, setViewMode] = useState<'force' | 'timeline' | 'cluster'>('force');
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [computedEdges, setComputedEdges] = useState<DayGraphLink[]>([]);
    const graphRef = useRef<{ d3ReheatSimulation: () => void } | null>(null);

    // Build daily growth nodes from existing data
    useEffect(() => {
        if (initialized) return;
        setInitialized(true);
        buildDailyNodes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildDailyNodes = useCallback(() => {
        setKnowledgeLoading(true);

        dailyCalendarEntries.forEach((entry) => {
            // Find habits completed on this date
            const dayHabits = habits
                .filter((h) => h.completedDates.includes(entry.date))
                .map((h) => h.name);

            // Count quests completed on this date
            const dayQuests = tasks.filter(
                (t) => t.completed && t.completedAt?.startsWith(entry.date)
            ).length;

            // Extract concepts from learned text
            const concepts = entry.learned
                ? entry.learned
                    .split(/[,;\.\n]/)
                    .map((s) => s.trim().toLowerCase())
                    .filter((s) => s.length > 2 && s.length < 50)
                : [];

            const growthNode: DailyGrowthNode = {
                id: `day-${entry.date}`,
                logDate: entry.date,
                productivityScore: entry.productivityScore || 5,
                conceptsLearned: concepts,
                habitsCompleted: dayHabits,
                questsCompleted: dayQuests,
                wordsReviewed: 0,
                focusMinutes: 0,
                energyRating: 5,
                logSummary: entry.summary || '',
            };

            upsertDailyGrowthNode(growthNode);
        });

        // Compute edges
        computeEdges();
        setKnowledgeLoading(false);
    }, [dailyCalendarEntries, habits, tasks, upsertDailyGrowthNode, setKnowledgeLoading]);

    const computeEdges = useCallback(() => {
        const nodes = dailyCalendarEntries.map((entry) => {
            const concepts = entry.learned
                ? entry.learned.split(/[,;\.\n]/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 2)
                : [];
            const dayHabits = habits.filter((h) => h.completedDates.includes(entry.date)).map((h) => h.name);

            return {
                id: `day-${entry.date}`,
                logDate: entry.date,
                conceptsLearned: concepts,
                habitsCompleted: dayHabits,
                questsCompleted: tasks.filter((t) => t.completed && t.completedAt?.startsWith(entry.date)).length,
            };
        });

        const edges: DayGraphLink[] = [];

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];

                // Shared concepts
                const sharedConcepts = a.conceptsLearned.filter(
                    (c) => b.conceptsLearned.some((bc) => bc.includes(c) || c.includes(bc))
                );
                if (sharedConcepts.length > 0) {
                    edges.push({
                        source: a.id,
                        target: b.id,
                        type: 'topic',
                        weight: Math.min(sharedConcepts.length / 3, 1),
                    });
                }

                // Habit continuity for sequential days
                const dayDiff = Math.abs(
                    (new Date(a.logDate).getTime() - new Date(b.logDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                if (dayDiff === 1) {
                    const sharedHabits = a.habitsCompleted.filter((h) => b.habitsCompleted.includes(h));
                    if (sharedHabits.length > 0) {
                        edges.push({
                            source: a.id,
                            target: b.id,
                            type: 'habit',
                            weight: Math.min(sharedHabits.length / 5, 0.5),
                        });
                    }
                }
            }
        }

        setComputedEdges(edges);
    }, [dailyCalendarEntries, habits, tasks]);

    // Build graph data
    const graphData = useMemo(() => {
        // Determine streaks
        const sortedDates = dailyCalendarEntries
            .map((e) => e.date)
            .sort();
        const streakSet = new Set<string>();
        for (let i = 0; i < sortedDates.length; i++) {
            const curr = new Date(sortedDates[i]);
            const prev = i > 0 ? new Date(sortedDates[i - 1]) : null;
            if (prev && (curr.getTime() - prev.getTime()) === 86400000) {
                streakSet.add(sortedDates[i]);
                streakSet.add(sortedDates[i - 1]);
            }
        }

        const graphNodes: DayGraphNode[] = dailyCalendarEntries.map((entry) => {
            const score = entry.productivityScore || 5;
            const concepts = entry.learned
                ? entry.learned.split(/[,;\.\n]/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 2)
                : [];
            const dayHabits = habits.filter((h) => h.completedDates.includes(entry.date)).map((h) => h.name);
            const dayQuests = tasks.filter((t) => t.completed && t.completedAt?.startsWith(entry.date)).length;

            return {
                id: `day-${entry.date}`,
                label: new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                logDate: entry.date,
                score,
                color: getScoreColor(score),
                size: 4 + score * 0.8,
                conceptsLearned: concepts,
                habitsCompleted: dayHabits,
                questsCompleted: dayQuests,
                wordsReviewed: 0,
                focusMinutes: 0,
                logSummary: entry.summary || '',
                isStreak: streakSet.has(entry.date),
            };
        });

        return { nodes: graphNodes, links: computedEdges };
    }, [dailyCalendarEntries, habits, tasks, computedEdges]);

    const selectedDayData = useMemo(() => {
        if (!selectedDay) return null;
        const node = graphData.nodes.find((n) => n.id === selectedDay);
        if (!node) return null;
        const entry = dailyCalendarEntries.find((e) => `day-${e.date}` === selectedDay);
        return { node, entry };
    }, [selectedDay, graphData.nodes, dailyCalendarEntries]);

    // Compound growth stats
    const stats = useMemo(() => {
        const totalDays = graphData.nodes.length;
        const avgScore = totalDays > 0
            ? graphData.nodes.reduce((s, n) => s + n.score, 0) / totalDays
            : 0;

        // Current streak
        const sortedDates = dailyCalendarEntries.map((e) => e.date).sort().reverse();
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        for (let i = 0; i < sortedDates.length; i++) {
            const expected = new Date();
            expected.setDate(expected.getDate() - i);
            const expStr = expected.toISOString().split('T')[0];
            if (sortedDates.includes(expStr)) {
                streak++;
            } else {
                break;
            }
        }

        // Compound multiplier
        const compound = Math.pow(1.003, totalDays);

        return {
            totalDays,
            avgScore: avgScore.toFixed(1),
            totalConnections: computedEdges.length,
            streak,
            compound: compound.toFixed(3),
        };
    }, [graphData.nodes, dailyCalendarEntries, computedEdges]);

    // Custom node rendering
    const paintNode = useCallback((node: DayGraphNode, ctx: CanvasRenderingContext2D) => {
        const { x = 0, y = 0, size = 6, label, color, score, isStreak } = node;
        const isHovered = hoveredDay === node.id;
        const isSelected = selectedDay === node.id;
        const isConnected = hoveredDay && computedEdges.some(
            (e) => (e.source === hoveredDay && e.target === node.id) ||
                (e.target === hoveredDay && e.source === node.id)
        );
        const dimmed = hoveredDay && !isHovered && !isConnected;

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.12 : 1;

        // Gold ring for streak days
        if (isStreak && !dimmed) {
            ctx.beginPath();
            ctx.arc(x, y, size + 2, 0, 2 * Math.PI);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Glow for selected/hovered
        if (isSelected || isHovered) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner circle with darker shade
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = getScoreGradient(score);
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = isSelected ? 2 : 0.5;
        ctx.stroke();

        // Label
        if (isHovered || isSelected || size > 8) {
            ctx.shadowBlur = 0;
            ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${Math.max(3, size * 0.7)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)';
            ctx.fillText(label, x, y + size + 2);
        }

        ctx.restore();
    }, [hoveredDay, selectedDay, computedEdges]);

    const paintLink = useCallback((link: DayGraphLink, ctx: CanvasRenderingContext2D) => {
        const source = link.source as unknown as DayGraphNode;
        const target = link.target as unknown as DayGraphNode;
        if (!source?.x || !target?.x) return;

        const isHighlighted = hoveredDay &&
            (source.id === hoveredDay || target.id === hoveredDay);
        const dimmed = hoveredDay && !isHighlighted;

        const typeColors: Record<string, string> = {
            topic: '#60a5fa',
            habit: '#4ade80',
            skill: '#a78bfa',
        };

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.03 : 0.15 + link.weight * 0.35;
        ctx.strokeStyle = isHighlighted ? (typeColors[link.type] || '#60a5fa') : '#334155';
        ctx.lineWidth = 0.5 + link.weight * 1.5;

        // Curved line
        const midX = (source.x + target.x) / 2;
        const midY = ((source.y ?? 0) + (target.y ?? 0)) / 2;
        const dist = Math.sqrt(
            (target.x - source.x) ** 2 + ((target.y ?? 0) - (source.y ?? 0)) ** 2
        );
        const offset = dist * 0.08;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y ?? 0);
        ctx.quadraticCurveTo(midX + offset, midY - offset, target.x, target.y ?? 0);
        ctx.stroke();
        ctx.restore();
    }, [hoveredDay]);

    return (
        <div className={`min-h-screen bg-[var(--color-bg-dark)] ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* Header */}
            {!isFullscreen && (
                <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-sm sticky top-0 z-30">
                    <div className="max-w-[1800px] mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link href="/" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
                                    <ChevronLeft size={20} />
                                </Link>
                                <div>
                                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                        <GitBranch size={20} className="text-[var(--color-green)]" />
                                        Daily Growth Web
                                    </h1>
                                    <p className="text-xs text-[var(--color-text-secondary)]">
                                        Watch your knowledge compound — every day connected by what you learned
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/knowledge"
                                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)] transition-colors"
                                >
                                    ← Knowledge Graph
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Stats Bar */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/50">
                <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center gap-4 text-xs overflow-x-auto">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Calendar size={12} className="text-[var(--color-text-muted)]" />
                        <span className="text-[var(--color-text-muted)]">Days Logged</span>
                        <span className="text-white font-mono font-semibold">{stats.totalDays}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <BarChart3 size={12} className="text-[var(--color-text-muted)]" />
                        <span className="text-[var(--color-text-muted)]">Avg Score</span>
                        <span className="text-white font-mono font-semibold">{stats.avgScore}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Network size={12} className="text-[var(--color-text-muted)]" />
                        <span className="text-[var(--color-text-muted)]">Connections</span>
                        <span className="text-white font-mono font-semibold">{stats.totalConnections}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Flame size={12} className="text-[var(--color-yellow)]" />
                        <span className="text-[var(--color-text-muted)]">Streak</span>
                        <span className="text-white font-mono font-semibold">{stats.streak}d</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <TrendingUp size={12} className="text-[var(--color-green)]" />
                        <span className="text-[var(--color-text-muted)]">Compound</span>
                        <span className="text-[var(--color-green)] font-mono font-semibold">×{stats.compound}</span>
                    </div>
                    <div className="flex-1" />

                    {/* View mode toggles */}
                    <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-lg p-0.5">
                        {([
                            { mode: 'force' as const, icon: Network, label: 'Force' },
                            { mode: 'timeline' as const, icon: GitBranch, label: 'Timeline' },
                            { mode: 'cluster' as const, icon: Layers, label: 'Cluster' },
                        ]).map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${viewMode === mode
                                    ? 'bg-[var(--color-bg-hover)] text-white'
                                    : 'text-[var(--color-text-muted)] hover:text-white'
                                    }`}
                            >
                                <Icon size={10} />
                                {label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button
                        onClick={() => { setInitialized(false); buildDailyNodes(); }}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Graph */}
            <div className="relative" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}>
                {knowledgeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--color-bg-dark)]/80">
                        <Loader2 className="animate-spin text-[var(--color-green)]" size={32} />
                    </div>
                )}

                {graphData.nodes.length === 0 && !knowledgeLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <GitBranch size={48} className="text-[var(--color-text-muted)] mb-4" />
                        <h2 className="text-lg font-semibold text-white mb-2">Start Building Your Growth Web</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
                            Log your daily progress in the Slight Edge calendar. Each day becomes a node,
                            and connections form when you revisit topics, continue habits, or build on skills.
                        </p>
                        <Link href="/goals/calendar" className="px-4 py-2 text-sm rounded-lg bg-[var(--color-green)]/20 text-[var(--color-green)] border border-[var(--color-green)]/30 hover:bg-[var(--color-green)]/30 transition-colors">
                            Slight Edge Calendar →
                        </Link>
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={graphRef as React.MutableRefObject<never>}
                        graphData={graphData}
                        nodeCanvasObject={(node, ctx) => paintNode(node as DayGraphNode, ctx)}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            const n = node as DayGraphNode;
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(n.x || 0, n.y || 0, n.size || 6, 0, 2 * Math.PI);
                            ctx.fill();
                        }}
                        linkCanvasObject={(link, ctx) => paintLink(link as unknown as DayGraphLink, ctx)}
                        onNodeClick={(node) => setSelectedDay((node as DayGraphNode).id)}
                        onNodeHover={(node) => setHoveredDay(node ? (node as DayGraphNode).id : null)}
                        onBackgroundClick={() => setSelectedDay(null)}
                        backgroundColor="rgba(0,0,0,0)"
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}
                        warmupTicks={50}
                        cooldownTime={3000}
                        enableNodeDrag={true}
                        enableZoomInteraction={true}
                        enablePanInteraction={true}
                        width={typeof window !== 'undefined' ? window.innerWidth - (isFullscreen ? 0 : 256) : 800}
                        height={typeof window !== 'undefined' ? (isFullscreen ? window.innerHeight : window.innerHeight - 140) : 600}
                    />
                )}

                {/* Compound Growth Indicator */}
                {graphData.nodes.length > 0 && (
                    <div className="absolute top-4 right-4 bg-[var(--color-bg-card)]/90 backdrop-blur-sm rounded-lg border border-[var(--color-border)] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Compound Growth</p>
                        <p className="text-2xl font-bold text-[var(--color-green)] font-mono">×{stats.compound}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">1.003^{stats.totalDays} days</p>
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-[var(--color-bg-card)]/90 backdrop-blur-sm rounded-lg border border-[var(--color-border)] p-3 text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Score Colors</p>
                    <div className="flex gap-1">
                        {[2, 4, 6, 8, 10].map((s) => (
                            <div key={s} className="flex flex-col items-center gap-0.5">
                                <div className="w-3 h-3 rounded-full" style={{ background: getScoreColor(s) }} />
                                <span className="text-[9px] text-[var(--color-text-muted)]">{s}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-3 h-3 rounded-full border-2 border-[var(--color-yellow)]" />
                        <span className="text-[var(--color-text-secondary)]">Streak day</span>
                    </div>
                </div>
            </div>

            {/* Day Detail Panel */}
            <AnimatePresence>
                {selectedDayData && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-80 lg:w-96 z-50 bg-[var(--color-bg-card)]/95 backdrop-blur-xl border-l border-[var(--color-border)] shadow-2xl overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--color-text-muted)]">Daily Log</p>
                                <h2 className="text-lg font-bold text-white">
                                    {new Date(selectedDayData.node.logDate + 'T12:00:00').toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'long', day: 'numeric',
                                    })}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Score */}
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2"
                                    style={{
                                        background: getScoreColor(selectedDayData.node.score) + '20',
                                        borderColor: getScoreColor(selectedDayData.node.score),
                                        color: getScoreColor(selectedDayData.node.score),
                                    }}
                                >
                                    {selectedDayData.node.score}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Productivity Score</p>
                                    <p className="text-xs text-[var(--color-text-secondary)]">
                                        {selectedDayData.node.isStreak ? '🔥 Streak day' : 'Logged'}
                                    </p>
                                </div>
                            </div>

                            {/* Summary */}
                            {selectedDayData.node.logSummary && (
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">What I Did</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">{selectedDayData.node.logSummary}</p>
                                </div>
                            )}

                            {/* Learned */}
                            {selectedDayData.entry?.learned && (
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">What I Learned</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">{selectedDayData.entry.learned}</p>
                                </div>
                            )}

                            {/* Concepts */}
                            {selectedDayData.node.conceptsLearned.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Concepts</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedDayData.node.conceptsLearned.map((c, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-blue)]/10 text-[var(--color-blue)] border border-[var(--color-blue)]/20"
                                            >
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Activity Breakdown */}
                            <div className="grid grid-cols-2 gap-2">
                                <MiniStat label="Habits" value={selectedDayData.node.habitsCompleted.length.toString()} />
                                <MiniStat label="Quests" value={selectedDayData.node.questsCompleted.toString()} />
                                <MiniStat label="Words" value={selectedDayData.node.wordsReviewed.toString()} />
                                <MiniStat label="Focus" value={`${selectedDayData.node.focusMinutes}m`} />
                            </div>

                            {/* Habits list */}
                            {selectedDayData.node.habitsCompleted.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Habits Completed</p>
                                    <div className="space-y-1">
                                        {selectedDayData.node.habitsCompleted.map((h, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                                <Zap size={10} className="text-[var(--color-green)]" />
                                                {h}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Connected days */}
                            <div className="mt-4">
                                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Connected Days</p>
                                {(() => {
                                    const connected = computedEdges
                                        .filter((e) => e.source === selectedDayData!.node.id || e.target === selectedDayData!.node.id)
                                        .map((e) => {
                                            const otherId = e.source === selectedDayData!.node.id ? e.target : e.source;
                                            const otherNode = graphData.nodes.find((n) => n.id === otherId);
                                            return otherNode ? { node: otherNode, edge: e } : null;
                                        })
                                        .filter(Boolean) as { node: DayGraphNode; edge: DayGraphLink }[];

                                    if (connected.length === 0) {
                                        return <p className="text-xs text-[var(--color-text-muted)] italic">No connections yet</p>;
                                    }

                                    return (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {connected.map(({ node: cn, edge }) => (
                                                <button
                                                    key={cn.id}
                                                    onClick={() => setSelectedDay(cn.id)}
                                                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-dark)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] transition-colors text-left"
                                                >
                                                    <div
                                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                                        style={{ background: cn.color }}
                                                    />
                                                    <span className="text-sm text-white flex-1">{cn.label}</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                                        {edge.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[var(--color-bg-dark)] rounded-lg p-2 border border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
        </div>
    );
}
