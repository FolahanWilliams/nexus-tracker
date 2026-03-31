'use client';

import { useState, useMemo } from 'react';
import { Search, BookOpen, Video, FileText, Newspaper, Loader2, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useAIFetch } from '@/hooks/useAIFetch';
import type { KnowledgePillar } from '@/store/types';

const PILLAR_SCHEDULE: Record<number, KnowledgePillar> = {
    1: 'psychology', 2: 'strategy', 3: 'systems', 4: 'probability',
    5: 'communication', 6: 'tech', 0: 'synthesis',
};

const PILLAR_COLORS: Record<string, string> = {
    psychology: 'var(--color-purple)',
    strategy: 'var(--color-blue)',
    systems: 'var(--color-green)',
    probability: 'var(--color-orange)',
    communication: 'var(--color-yellow)',
    tech: 'var(--color-cyan)',
    synthesis: 'var(--color-pink)',
};

const CONTENT_TYPES = [
    { id: 'any', label: 'All', icon: Sparkles },
    { id: 'article', label: 'Articles', icon: Newspaper },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'book', label: 'Books', icon: BookOpen },
    { id: 'paper', label: 'Papers', icon: FileText },
] as const;

interface SearchResult {
    result: string;
}

export default function ContentDiscoveryPanel() {
    const modelCards = useGameStore((s) => s.hitsModelCards);
    const session = useGameStore((s) => s.hitsDailySession);

    const todayPillar = PILLAR_SCHEDULE[new Date().getDay()] || 'synthesis';
    const pillarColor = PILLAR_COLORS[todayPillar] || 'var(--color-purple)';

    const [searchTopic, setSearchTopic] = useState('');
    const [contentType, setContentType] = useState<string>('any');
    const [searchResult, setSearchResult] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const { execute: fetchContent, isLoading } = useAIFetch<SearchResult>('/api/hoot-search', {
        timeout: 45000,
        logTag: 'HITS-Content',
    });

    // Smart suggestions based on pillar + recent cards
    const suggestions = useMemo(() => {
        const pillarSuggestions: Record<string, string[]> = {
            psychology: ['cognitive biases', 'behavioral economics', 'decision fatigue', 'nudge theory', 'dual process theory'],
            strategy: ['game theory', 'competitive advantage', 'first principles thinking', 'blue ocean strategy', 'asymmetric warfare'],
            systems: ['systems thinking', 'feedback loops', 'emergence', 'network effects', 'second order effects'],
            probability: ['Bayesian reasoning', 'expected value', 'fat tails', 'regression to the mean', 'base rate neglect'],
            communication: ['persuasion frameworks', 'storytelling structures', 'rhetorical devices', 'active listening', 'framing effects'],
            tech: ['scalability patterns', 'distributed systems', 'machine learning intuitions', 'algorithmic thinking', 'technology adoption curves'],
            synthesis: ['mental model combinations', 'cross-domain thinking', 'analogical reasoning', 'latticework of models', 'multidisciplinary insights'],
        };

        const base = pillarSuggestions[todayPillar] || pillarSuggestions.synthesis;

        // Add suggestions from recent model cards that haven't been well-recalled
        const lowRecall = modelCards
            .filter(c => (c.recallScore ?? 0) < 60)
            .slice(-3)
            .map(c => c.name);

        return [...new Set([...lowRecall, ...base])].slice(0, 6);
    }, [todayPillar, modelCards]);

    const handleSearch = async (topic?: string) => {
        const query = topic || searchTopic.trim();
        if (!query) return;

        const typeStr = contentType !== 'any' ? contentType + 's' : 'articles, videos, and resources';
        const pillarCtx = session?.pillar || todayPillar;
        const recentModels = modelCards.slice(-5).map(c => c.name).join(', ');

        let searchQuery = `Best ${typeStr} about "${query}" for learning mental models and thinking frameworks in ${pillarCtx}`;
        if (recentModels) searchQuery += `. The learner has studied: ${recentModels}`;
        searchQuery += '. Include specific titles, authors, and why each resource is valuable.';

        const data = await fetchContent({ query: searchQuery });
        if (data?.result) {
            setSearchResult(data.result);
            setHasSearched(true);
            if (!searchTopic && topic) setSearchTopic(topic);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-1">
                    <Search size={18} style={{ color: pillarColor }} />
                    <h2 className="text-sm font-bold">Content Discovery</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                        background: `color-mix(in srgb, ${pillarColor} 15%, transparent)`,
                        color: pillarColor,
                    }}>
                        {todayPillar.toUpperCase()}
                    </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                    Search the web for articles, videos, books, and papers to deepen your mental model knowledge
                </p>
            </div>

            {/* Search Bar */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchTopic}
                            onChange={(e) => setSearchTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search for a topic, mental model, or concept..."
                            className="w-full px-3 py-2.5 pl-9 rounded-lg text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-purple)] transition-colors"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={isLoading || !searchTopic.trim()}
                        className="px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
                        style={{ background: pillarColor }}
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                    </button>
                </div>

                {/* Content Type Filter */}
                <div className="flex gap-1.5">
                    {CONTENT_TYPES.map(ct => {
                        const Icon = ct.icon;
                        const active = contentType === ct.id;
                        return (
                            <button
                                key={ct.id}
                                onClick={() => setContentType(ct.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all border"
                                style={{
                                    color: active ? pillarColor : 'var(--color-text-secondary)',
                                    background: active ? `color-mix(in srgb, ${pillarColor} 12%, transparent)` : 'transparent',
                                    borderColor: active ? pillarColor : 'var(--color-border)',
                                }}
                            >
                                <Icon size={12} />
                                {ct.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Suggestions */}
            {!hasSearched && (
                <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold flex items-center gap-1">
                        <Sparkles size={10} /> Suggested for today&apos;s {todayPillar} pillar
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSearch(s)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:border-[var(--color-text-secondary)] transition-all disabled:opacity-40"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading State */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-secondary)]"
                    >
                        <Loader2 size={20} className="animate-spin" style={{ color: pillarColor }} />
                        <span className="text-sm">Searching the web for {contentType !== 'any' ? contentType + 's' : 'content'}...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
                {searchResult && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
                                <ExternalLink size={12} /> Results for &ldquo;{searchTopic}&rdquo;
                            </p>
                            <button
                                onClick={() => handleSearch()}
                                className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors flex items-center gap-1"
                            >
                                <RefreshCw size={10} /> Refresh
                            </button>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                            <div
                                className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap [&_a]:text-[var(--color-blue)] [&_a]:underline"
                                dangerouslySetInnerHTML={{ __html: formatResult(searchResult) }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state after first search */}
            {hasSearched && !searchResult && !isLoading && (
                <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                    No results found. Try a different topic or keyword.
                </div>
            )}
        </div>
    );
}

/** Basic markdown-like formatting for the AI search result */
function formatResult(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gm, '<h3 class="text-white font-bold mt-3 mb-1">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-white font-bold text-base mt-4 mb-1">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-white font-bold text-lg mt-4 mb-2">$1</h1>')
        .replace(/^- (.*$)/gm, '<div class="flex gap-2 ml-2"><span class="text-[var(--color-text-muted)]">•</span><span>$1</span></div>')
        .replace(/\n/g, '<br/>');
}
