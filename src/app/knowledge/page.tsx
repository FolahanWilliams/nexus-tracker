'use client';

import { useGameStore } from '@/store/useGameStore';
import type { KnowledgeNode, KnowledgeEdge } from '@/store/useGameStore';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useKnowledgeGraphSync } from '@/hooks/useKnowledgeGraphSync';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    ChevronLeft, Search, Filter, BookOpen, Brain, TrendingUp,
    Maximize2, Minimize2, Network, Loader2, RefreshCw,
    Play, Pause, SkipBack, Clock, Crosshair, Box, Palette, Map,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KnowledgeNodeDetail from '@/components/KnowledgeNodeDetail';
import { useGraphDimensions } from '@/hooks/useGraphDimensions';
import dynamic from 'next/dynamic';

// Dynamically import the graph to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
    tech: '#60a5fa',
    health: '#4ade80',
    finance: '#fbbf24',
    'personal-development': '#a78bfa',
    creative: '#f472b6',
    science: '#22d3ee',
    language: '#fb923c',
    social: '#f87171',
    career: '#34d399',
    other: '#94a3b8',
};

function getCategoryColor(category: string): string {
    return CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS.other;
}

// Edge type color map
const EDGE_TYPE_COLORS: Record<string, string> = {
    co_occurrence: '#60a5fa',   // blue
    semantic: '#c084fc',        // purple
    vocab_concept: '#fb923c',   // orange
    prerequisite: '#4ade80',    // green
};

function getEdgeTypeColor(edgeType: string): string {
    return EDGE_TYPE_COLORS[edgeType] || '#475569';
}

function getMasteryColor(score: number | null): string {
    if (score == null) return '#94a3b8';
    if (score >= 0.8) return '#4ade80';
    if (score >= 0.6) return '#a3e635';
    if (score >= 0.4) return '#fbbf24';
    if (score >= 0.2) return '#fb923c';
    return '#ef4444';
}

interface GraphNode {
    id: string;
    label: string;
    nodeType: string;
    category: string;
    size: number;
    color: string;
    x?: number;
    y?: number;
}

interface GraphLink {
    source: string;
    target: string;
    weight: number;
    edgeType: string;
}

export default function KnowledgePage() {
    const {
        knowledgeNodes, knowledgeEdges, selectedKnowledgeNodeId,
        knowledgeFilters, knowledgeLoading, selectKnowledgeNode,
        setKnowledgeFilter, setKnowledgeLoading, addKnowledgeNodes,
        addKnowledgeEdges, vocabWords, dailyCalendarEntries, tasks,
        reflectionNotes, activityLog,
    } = useGameStore();

    // Sync knowledge graph to/from Supabase
    useKnowledgeGraphSync();

    const searchParams = useSearchParams();
    const traceConceptParam = searchParams.get('trace');

    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphRef = useRef<any>(null);
    const graphDimensions = useGraphDimensions(isFullscreen, 180);

    // ── New visualization features ──
    const [edgeColoringEnabled, setEdgeColoringEnabled] = useState(true);
    const [is3D, setIs3D] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const globalScaleRef = useRef(1);

    // ── Time Slider state ──
    const [timeSliderEnabled, setTimeSliderEnabled] = useState(false);
    const [timeSliderValue, setTimeSliderValue] = useState(100); // percentage 0-100
    const [timeSliderPlaying, setTimeSliderPlaying] = useState(false);
    const timeSliderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Particle flow state ──
    const [particleFlowNodeId, setParticleFlowNodeId] = useState<string | null>(null);
    const particlesRef = useRef<{ x: number; y: number; progress: number; edgeIdx: number }[]>([]);
    const animFrameRef = useRef<number | null>(null);

    // ── Trace concept from URL (growth path trace) ──
    const [tracedConcept, setTracedConcept] = useState<string | null>(traceConceptParam);
    useEffect(() => {
        setTracedConcept(traceConceptParam);
    }, [traceConceptParam]);

    // Build knowledge nodes from existing data on first load
    useEffect(() => {
        if (initialized) return;
        setInitialized(true);
        buildGraphFromExistingData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildGraphFromExistingData = useCallback(() => {
        setKnowledgeLoading(true);
        const nodes: KnowledgeNode[] = [];
        const edges: KnowledgeEdge[] = [];
        const now = new Date().toISOString();

        // 1. WordForge vocabulary → word nodes
        vocabWords.forEach((w) => {
            const mastery = w.status === 'mastered' ? 1 :
                w.status === 'reviewing' ? 0.7 :
                    w.status === 'learning' ? 0.4 : 0.1;
            nodes.push({
                id: `word-${w.id}`,
                label: w.word.toLowerCase(),
                nodeType: 'word',
                category: w.category || 'language',
                source: 'wordforge',
                sourceId: w.id,
                firstSeenAt: w.dateAdded,
                lastSeenAt: w.lastReviewed || w.dateAdded,
                mentionCount: w.totalReviews || 1,
                masteryScore: mastery,
            });
        });

        // 2. Slight Edge daily logs → concept nodes from "learned" text
        const conceptMap = new Map<string, KnowledgeNode>();
        dailyCalendarEntries.forEach((entry) => {
            if (!entry.learned) return;
            // Simple keyword extraction (split on commas, periods, "and")
            const keywords = entry.learned
                .split(/[,;\.\n]/)
                .map((s) => s.trim().toLowerCase())
                .filter((s) => s.length > 2 && s.length < 50);

            keywords.forEach((kw) => {
                const normalized = kw.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                if (!normalized || normalized.length < 3) return;
                const existing = conceptMap.get(normalized);
                if (existing) {
                    existing.mentionCount++;
                    existing.lastSeenAt = entry.updatedAt || entry.createdAt;
                } else {
                    conceptMap.set(normalized, {
                        id: `concept-${normalized}`,
                        label: normalized,
                        nodeType: 'concept',
                        category: 'personal-development',
                        source: 'slight_edge',
                        sourceId: entry.date,
                        firstSeenAt: entry.createdAt,
                        lastSeenAt: entry.updatedAt || entry.createdAt,
                        mentionCount: 1,
                        masteryScore: null,
                    });
                }
            });

            // Create co-occurrence edges between concepts in the same log
            const dayKeywords = keywords.map((kw) =>
                kw.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            ).filter((k) => k.length >= 3);

            for (let i = 0; i < dayKeywords.length; i++) {
                for (let j = i + 1; j < dayKeywords.length; j++) {
                    const a = `concept-${dayKeywords[i]}`;
                    const b = `concept-${dayKeywords[j]}`;
                    const edgeId = `edge-${a}-${b}`;
                    const existing = edges.find((e) => e.id === edgeId);
                    if (existing) {
                        existing.weight += 0.3;
                    } else {
                        edges.push({
                            id: edgeId,
                            sourceNodeId: a,
                            targetNodeId: b,
                            edgeType: 'co_occurrence',
                            weight: 0.5,
                        });
                    }
                }
            }
        });

        // 3. Quest completions → skill nodes
        const skillMap = new Map<string, KnowledgeNode>();
        tasks.filter((t) => t.completed).forEach((t) => {
            const cat = t.category.toLowerCase();
            const existing = skillMap.get(cat);
            if (existing) {
                existing.mentionCount++;
                existing.lastSeenAt = t.completedAt || now;
            } else {
                skillMap.set(cat, {
                    id: `skill-${cat}`,
                    label: cat,
                    nodeType: 'skill',
                    category: cat === 'study' ? 'tech' : cat === 'health' ? 'health' : 'career',
                    source: 'quest',
                    firstSeenAt: t.completedAt || now,
                    lastSeenAt: t.completedAt || now,
                    mentionCount: 1,
                    masteryScore: null,
                });
            }
        });

        // 4. Reflection notes → concept nodes
        reflectionNotes.forEach((r) => {
            if (!r.note) return;
            const keywords = r.note
                .split(/[,;\.\n]/)
                .map((s) => s.trim().toLowerCase())
                .filter((s) => s.length > 2 && s.length < 50);
            keywords.forEach((kw) => {
                const normalized = kw.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                if (!normalized || normalized.length < 3) return;
                const existing = conceptMap.get(normalized);
                if (existing) {
                    existing.mentionCount++;
                    existing.lastSeenAt = r.date;
                } else {
                    conceptMap.set(normalized, {
                        id: `concept-${normalized}`,
                        label: normalized,
                        nodeType: 'concept',
                        category: 'personal-development',
                        source: 'reflection',
                        sourceId: r.date,
                        firstSeenAt: r.date,
                        lastSeenAt: r.date,
                        mentionCount: 1,
                        masteryScore: null,
                    });
                }
            });
        });

        // 5. MindForge activity → concept/skill nodes from activity log
        activityLog.forEach((a) => {
            if (a.type !== 'xp_earned') return;
            let exerciseType = '';
            let topic = '';
            if (a.text.includes('Argument Builder')) {
                exerciseType = 'argument';
                topic = a.detail || '';
            } else if (a.text.includes('Analogy Engine')) {
                exerciseType = 'analogy';
                topic = a.detail || '';
            } else if (a.text.includes('Summary Challenge')) {
                exerciseType = 'summary';
                topic = a.detail || '';
            } else if (a.text.includes('Impromptu Speaking')) {
                exerciseType = 'speaking';
                topic = a.detail || '';
            }
            if (!exerciseType || !topic) return;

            // Create skill node for exercise type
            const skillLabel = `${exerciseType}-skill`;
            if (!skillMap.has(skillLabel)) {
                skillMap.set(skillLabel, {
                    id: `skill-${skillLabel}`,
                    label: skillLabel,
                    nodeType: 'skill',
                    category: 'personal-development',
                    source: 'mindforge',
                    firstSeenAt: a.timestamp,
                    lastSeenAt: a.timestamp,
                    mentionCount: 1,
                    masteryScore: null,
                });
            } else {
                skillMap.get(skillLabel)!.mentionCount++;
                skillMap.get(skillLabel)!.lastSeenAt = a.timestamp;
            }

            // Create concept node for the topic
            const topicLabel = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-↔]/g, '').slice(0, 50);
            if (topicLabel.length >= 3) {
                const existing = conceptMap.get(topicLabel);
                if (existing) {
                    existing.mentionCount++;
                    existing.lastSeenAt = a.timestamp;
                } else {
                    conceptMap.set(topicLabel, {
                        id: `concept-${topicLabel}`,
                        label: topicLabel,
                        nodeType: 'concept',
                        category: exerciseType === 'analogy' ? 'creative' : 'personal-development',
                        source: 'mindforge',
                        sourceId: `${exerciseType}-${a.id}`,
                        firstSeenAt: a.timestamp,
                        lastSeenAt: a.timestamp,
                        mentionCount: 1,
                        masteryScore: null,
                    });
                }

                // Edge: topic → exercise skill
                edges.push({
                    id: `edge-concept-${topicLabel}-skill-${skillLabel}`,
                    sourceNodeId: `concept-${topicLabel}`,
                    targetNodeId: `skill-${skillLabel}`,
                    edgeType: 'co_occurrence',
                    weight: 0.6,
                });

                // For analogy: parse conceptA ↔ conceptB and link them
                if (exerciseType === 'analogy' && topic.includes('↔')) {
                    const [aRaw, bRaw] = topic.split('↔').map((s) => s.trim());
                    const aLabel = aRaw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    const bLabel = bRaw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    if (aLabel.length >= 3 && bLabel.length >= 3 && aLabel !== bLabel) {
                        [aLabel, bLabel].forEach((lbl) => {
                            if (!conceptMap.has(lbl)) {
                                conceptMap.set(lbl, {
                                    id: `concept-${lbl}`,
                                    label: lbl,
                                    nodeType: 'concept',
                                    category: 'creative',
                                    source: 'mindforge',
                                    firstSeenAt: a.timestamp,
                                    lastSeenAt: a.timestamp,
                                    mentionCount: 1,
                                    masteryScore: null,
                                });
                            }
                        });
                        edges.push({
                            id: `edge-analogy-${aLabel}-${bLabel}`,
                            sourceNodeId: `concept-${aLabel}`,
                            targetNodeId: `concept-${bLabel}`,
                            edgeType: 'semantic',
                            weight: 0.8,
                        });
                    }
                }
            }
        });

        // Re-add updated concept/skill maps
        nodes.push(...conceptMap.values());
        nodes.push(...skillMap.values());

        // 6. Create word-concept links if a word appears in any concept label
        vocabWords.forEach((w) => {
            const wordLabel = w.word.toLowerCase();
            conceptMap.forEach((concept) => {
                if (concept.label.includes(wordLabel) || wordLabel.includes(concept.label)) {
                    edges.push({
                        id: `edge-word-${w.id}-${concept.id}`,
                        sourceNodeId: `word-${w.id}`,
                        targetNodeId: concept.id,
                        edgeType: 'vocab_concept',
                        weight: 0.7,
                    });
                }
            });
        });

        if (nodes.length > 0) {
            addKnowledgeNodes(nodes);
            addKnowledgeEdges(edges);
        }
        setKnowledgeLoading(false);
    }, [vocabWords, dailyCalendarEntries, tasks, reflectionNotes, activityLog, addKnowledgeNodes, addKnowledgeEdges, setKnowledgeLoading]);

    // ── Time slider: compute date range from all nodes ──
    const dateRange = useMemo(() => {
        const dates = knowledgeNodes
            .map((n) => n.firstSeenAt)
            .filter(Boolean)
            .sort();
        if (dates.length === 0) return { min: '', max: '' };
        return { min: dates[0], max: dates[dates.length - 1] };
    }, [knowledgeNodes]);

    const timeSliderDate = useMemo(() => {
        if (!dateRange.min || !dateRange.max) return null;
        const minT = new Date(dateRange.min).getTime();
        const maxT = new Date(dateRange.max).getTime();
        const t = minT + (maxT - minT) * (timeSliderValue / 100);
        return new Date(t).toISOString();
    }, [dateRange, timeSliderValue]);

    // Time slider auto-play
    useEffect(() => {
        if (timeSliderPlaying) {
            timeSliderIntervalRef.current = setInterval(() => {
                setTimeSliderValue((prev) => {
                    if (prev >= 100) {
                        setTimeSliderPlaying(false);
                        return 100;
                    }
                    return Math.min(prev + 1, 100);
                });
            }, 120);
        }
        return () => {
            if (timeSliderIntervalRef.current) clearInterval(timeSliderIntervalRef.current);
        };
    }, [timeSliderPlaying]);

    // ── Search-to-zoom: auto-center on matched node ──
    useEffect(() => {
        if (!searchQuery || !graphRef.current) return;
        const q = searchQuery.toLowerCase();
        const match = (graphData.nodes as GraphNode[]).find(
            (n) => n.label.toLowerCase() === q
        );
        if (match && match.x != null && match.y != null) {
            if (is3D) {
                graphRef.current.cameraPosition?.(
                    { x: match.x, y: match.y, z: 200 },
                    { x: match.x, y: match.y, z: 0 },
                    1200
                );
            } else {
                graphRef.current.centerAt?.(match.x, match.y, 800);
                graphRef.current.zoom?.(4, 800);
            }
        }
    }, [searchQuery, graphData.nodes, is3D]);

    // ── Cluster label computation ──
    const clusterLabels = useMemo(() => {
        if (!graphData) return [];
        const categoryGroups = new Map<string, { xs: number[]; ys: number[] }>();
        for (const node of (graphData?.nodes || []) as GraphNode[]) {
            if (!node.x || !node.y) continue;
            const cat = node.category;
            if (!categoryGroups.has(cat)) categoryGroups.set(cat, { xs: [], ys: [] });
            const g = categoryGroups.get(cat)!;
            g.xs.push(node.x);
            g.ys.push(node.y);
        }
        const labels: { category: string; x: number; y: number; count: number }[] = [];
        categoryGroups.forEach((g, cat) => {
            if (g.xs.length < 3) return; // Only label clusters with 3+ nodes
            const cx = g.xs.reduce((a, b) => a + b, 0) / g.xs.length;
            const cy = g.ys.reduce((a, b) => a + b, 0) / g.ys.length;
            labels.push({ category: cat, x: cx, y: cy, count: g.xs.length });
        });
        return labels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphData?.nodes, hoveredNode, selectedKnowledgeNodeId]);

    // ── Particle flow: spawn particles when a node is clicked ──
    const startParticleFlow = useCallback((nodeId: string) => {
        setParticleFlowNodeId(nodeId);
        // Spawn particles on each connected edge
        const connectedEdges = knowledgeEdges
            .map((e, idx) => ({ ...e, idx }))
            .filter((e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
        const particles: typeof particlesRef.current = [];
        connectedEdges.forEach((e) => {
            for (let i = 0; i < 3; i++) {
                particles.push({
                    x: 0, y: 0,
                    progress: i * 0.33,
                    edgeIdx: e.idx,
                });
            }
        });
        particlesRef.current = particles;
        // Auto-stop after 3 seconds
        setTimeout(() => {
            setParticleFlowNodeId(null);
            particlesRef.current = [];
        }, 3000);
    }, [knowledgeEdges]);

    // Filter nodes (with time slider + trace concept support)
    const filteredNodes = useMemo(() => {
        return knowledgeNodes.filter((n) => {
            if (!knowledgeFilters.nodeTypes.includes(n.nodeType as 'word' | 'concept' | 'skill')) return false;
            if (knowledgeFilters.categories.length > 0 && !knowledgeFilters.categories.includes(n.category)) return false;
            if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (n.masteryScore != null) {
                if (n.masteryScore < knowledgeFilters.masteryRange[0] || n.masteryScore > knowledgeFilters.masteryRange[1]) return false;
            }
            if (knowledgeFilters.dateRange.start && n.firstSeenAt < knowledgeFilters.dateRange.start) return false;
            if (knowledgeFilters.dateRange.end && n.firstSeenAt > knowledgeFilters.dateRange.end) return false;
            // Time slider filter
            if (timeSliderEnabled && timeSliderDate && n.firstSeenAt > timeSliderDate) return false;
            return true;
        });
    }, [knowledgeNodes, knowledgeFilters, searchQuery, timeSliderEnabled, timeSliderDate]);

    // Build graph data
    const graphData = useMemo(() => {
        const nodeIds = new Set(filteredNodes.map((n) => n.id));
        const graphNodes: GraphNode[] = filteredNodes.map((n) => ({
            id: n.id,
            label: n.label,
            nodeType: n.nodeType,
            category: n.category,
            size: n.nodeType === 'word'
                ? 4 + (n.masteryScore || 0) * 8
                : n.nodeType === 'concept'
                    ? 4 + Math.min(n.mentionCount, 10) * 1.2
                    : 5 + Math.min(n.mentionCount, 20) * 0.8,
            color: n.nodeType === 'word'
                ? getMasteryColor(n.masteryScore)
                : getCategoryColor(n.category),
        }));

        const graphLinks: GraphLink[] = knowledgeEdges
            .filter((e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId))
            .map((e) => ({
                source: e.sourceNodeId,
                target: e.targetNodeId,
                weight: e.weight,
                edgeType: e.edgeType,
            }));

        return { nodes: graphNodes, links: graphLinks };
    }, [filteredNodes, knowledgeEdges]);

    const selectedNode = useMemo(
        () => knowledgeNodes.find((n) => n.id === selectedKnowledgeNodeId) || null,
        [knowledgeNodes, selectedKnowledgeNodeId]
    );

    // Get all unique categories
    const allCategories = useMemo(
        () => [...new Set(knowledgeNodes.map((n) => n.category).filter(Boolean))],
        [knowledgeNodes]
    );

    const stats = useMemo(() => ({
        totalNodes: filteredNodes.length,
        totalEdges: graphData.links.length,
        words: filteredNodes.filter((n) => n.nodeType === 'word').length,
        concepts: filteredNodes.filter((n) => n.nodeType === 'concept').length,
        skills: filteredNodes.filter((n) => n.nodeType === 'skill').length,
        topCategory: (() => {
            const counts = new Map<string, number>();
            filteredNodes.forEach((n) => counts.set(n.category, (counts.get(n.category) || 0) + 1));
            let max = 0, best = 'none';
            counts.forEach((v, k) => { if (v > max) { max = v; best = k; } });
            return best;
        })(),
    }), [filteredNodes, graphData.links]);

    // Custom node rendering — zoom-adaptive detail levels
    const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
        const { x = 0, y = 0, size = 6, label, nodeType, color, category } = node;
        const scale = globalScaleRef.current;
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedKnowledgeNodeId === node.id;
        const isConnected = hoveredNode && knowledgeEdges.some(
            (e) => (e.sourceNodeId === hoveredNode && e.targetNodeId === node.id) ||
                (e.targetNodeId === hoveredNode && e.sourceNodeId === node.id)
        );
        const dimmed = hoveredNode && !isHovered && !isConnected;
        const isTraced = tracedConcept && node.id === `concept-${tracedConcept}`;
        const isParticleTarget = particleFlowNodeId === node.id;

        // ── Zoom-adaptive detail levels ──
        // Low zoom (< 0.6): cluster blobs only — large translucent circles
        // Medium zoom (0.6–1.8): shapes without labels
        // High zoom (> 1.8): full labels + mastery rings + glow

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.15 : 1;

        if (scale < 0.6 && !isHovered && !isSelected && !isTraced) {
            // LOW ZOOM: soft cluster blob
            const blobSize = size * 1.5;
            const catColor = getCategoryColor(category);
            ctx.globalAlpha = dimmed ? 0.05 : 0.5;
            ctx.fillStyle = catColor;
            ctx.beginPath();
            ctx.arc(x, y, blobSize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
            return;
        }

        // Traced concept: pulsing ring
        if (isTraced) {
            const pulseSize = size + 4 + Math.sin(Date.now() / 300) * 2;
            ctx.beginPath();
            ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Particle target: outer glow
        if (isParticleTarget) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 25;
        }

        // Glow effect for selected/hovered
        if (isSelected || isHovered) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
        }

        // HIGH ZOOM (> 1.8): mastery ring behind node
        if (scale > 1.8 && nodeType === 'word') {
            const masteryNode = knowledgeNodes.find((n) => n.id === node.id);
            if (masteryNode?.masteryScore != null) {
                const ringRadius = size + 3;
                const masteryAngle = masteryNode.masteryScore * 2 * Math.PI;
                // Background ring
                ctx.beginPath();
                ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                // Mastery arc
                ctx.beginPath();
                ctx.arc(x, y, ringRadius, -Math.PI / 2, -Math.PI / 2 + masteryAngle);
                ctx.strokeStyle = getMasteryColor(masteryNode.masteryScore);
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = isSelected ? '#ffffff' : isTraced ? '#fbbf24' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = isSelected ? 2 : isTraced ? 1.5 : 0.5;

        if (nodeType === 'concept') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = x + size * Math.cos(angle);
                const py = y + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (nodeType === 'skill') {
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }

        // MEDIUM ZOOM: shapes only, no labels (unless hovered/selected/traced)
        // HIGH ZOOM: full labels
        const showLabel = scale > 1.8 || isHovered || isSelected || isTraced || (scale > 0.6 && size > 8);
        if (showLabel) {
            ctx.shadowBlur = 0;
            const fontSize = scale > 1.8
                ? Math.max(3.5, size * 0.85)
                : Math.max(3, size * 0.7);
            ctx.font = `${isHovered || isSelected || isTraced ? 'bold ' : ''}${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)';
            ctx.fillText(label, x, y + size + 2);
        }

        ctx.restore();
    }, [hoveredNode, selectedKnowledgeNodeId, knowledgeEdges, tracedConcept, particleFlowNodeId, knowledgeNodes]);

    const paintLink = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D) => {
        const source = link.source as unknown as GraphNode;
        const target = link.target as unknown as GraphNode;
        if (!source?.x || !target?.x) return;

        const scale = globalScaleRef.current;
        const isHighlighted = hoveredNode &&
            (source.id === hoveredNode || target.id === hoveredNode);
        const dimmed = hoveredNode && !isHighlighted;

        // Low zoom: skip thin edges entirely for performance
        if (scale < 0.6 && link.weight < 0.5 && !isHighlighted) {
            return;
        }

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.03 : 0.15 + link.weight * 0.4;

        // Edge type coloring
        if (edgeColoringEnabled) {
            ctx.strokeStyle = isHighlighted
                ? '#ffffff'
                : getEdgeTypeColor(link.edgeType);
        } else {
            ctx.strokeStyle = isHighlighted ? '#60a5fa' : '#475569';
        }
        ctx.lineWidth = isHighlighted ? 1.5 + link.weight * 1.5 : 0.5 + link.weight * 1.5;

        const midX = (source.x + target.x) / 2;
        const midY = ((source.y ?? 0) + (target.y ?? 0)) / 2;
        const curveOffset = Math.sqrt(
            (target.x - source.x) ** 2 + ((target.y ?? 0) - (source.y ?? 0)) ** 2
        ) * 0.1;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y ?? 0);
        ctx.quadraticCurveTo(midX + curveOffset, midY - curveOffset, target.x, target.y ?? 0);
        ctx.stroke();

        // High zoom: show edge type label on hover
        if (scale > 2.5 && isHighlighted) {
            const labelX = midX + curveOffset * 0.5;
            const labelY = midY - curveOffset * 0.5;
            ctx.globalAlpha = 0.8;
            ctx.font = `${Math.max(3, 8 / scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = edgeColoringEnabled ? getEdgeTypeColor(link.edgeType) : '#94a3b8';
            ctx.fillText(link.edgeType.replace('_', ' '), labelX, labelY);
        }

        // ── Particle flow on connected edges ──
        if (particleFlowNodeId && (source.id === particleFlowNodeId || target.id === particleFlowNodeId)) {
            const flowTowards = source.id === particleFlowNodeId;
            const sx = flowTowards ? target.x : source.x;
            const sy = flowTowards ? (target.y ?? 0) : (source.y ?? 0);
            const ex = flowTowards ? source.x : target.x;
            const ey = flowTowards ? (source.y ?? 0) : (target.y ?? 0);
            const cpx = midX + curveOffset;
            const cpy = midY - curveOffset;

            for (let i = 0; i < 3; i++) {
                const t = ((Date.now() / 1800 + i * 0.33) % 1);
                const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpx + t * t * ex;
                const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpy + t * t * ey;
                const alpha = 0.8 * (1 - Math.abs(t - 0.5) * 2);

                ctx.globalAlpha = alpha;
                ctx.fillStyle = edgeColoringEnabled ? getEdgeTypeColor(link.edgeType) : (source.color || '#60a5fa');
                ctx.beginPath();
                ctx.arc(px, py, 1.8, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        ctx.restore();
    }, [hoveredNode, particleFlowNodeId, edgeColoringEnabled]);

    // ── Cluster labels post-paint callback ──
    const onRenderFramePost = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
        globalScaleRef.current = globalScale;
        if (globalScale > 1.8) return;
        for (const cl of clusterLabels) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.12, 0.35 - globalScale * 0.12);
            ctx.font = `bold ${Math.max(12, 20 / globalScale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = getCategoryColor(cl.category);
            ctx.fillText(cl.category, cl.x, cl.y - 12 / globalScale);
            ctx.font = `${Math.max(8, 11 / globalScale)}px sans-serif`;
            ctx.globalAlpha *= 0.5;
            ctx.fillText(`${cl.count} nodes`, cl.x, cl.y + 8 / globalScale);
            ctx.restore();
        }
    }, [clusterLabels]);

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
                                        <Network size={20} className="text-[var(--color-blue)]" />
                                        Knowledge Network
                                    </h1>
                                    <p className="text-xs text-[var(--color-text-secondary)]">
                                        Your learning universe — words, concepts, and skills visualized
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/growth"
                                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)] transition-colors"
                                >
                                    Growth Web →
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Stats Bar */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/50">
                <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center gap-4 text-xs overflow-x-auto">
                    <StatPill label="Nodes" value={stats.totalNodes} />
                    <StatPill label="Connections" value={stats.totalEdges} />
                    <StatPill label="Words" value={stats.words} color="var(--color-green)" />
                    <StatPill label="Concepts" value={stats.concepts} color="var(--color-blue)" />
                    <StatPill label="Skills" value={stats.skills} color="var(--color-purple)" />
                    <StatPill label="Top Cluster" value={stats.topCategory} />
                    <div className="flex-1" />
                    <button
                        onClick={() => setEdgeColoringEnabled(!edgeColoringEnabled)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${edgeColoringEnabled
                            ? 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white'
                        }`}
                        title="Toggle edge type coloring"
                    >
                        <Palette size={10} />
                        Edge Colors
                    </button>
                    <button
                        onClick={() => setShowMinimap(!showMinimap)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${showMinimap
                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white'
                        }`}
                        title="Toggle minimap"
                    >
                        <Map size={10} />
                        Minimap
                    </button>
                    <button
                        onClick={() => setIs3D(!is3D)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${is3D
                            ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white'
                        }`}
                        title="Toggle 3D mode"
                    >
                        <Box size={10} />
                        3D
                    </button>
                    <button
                        onClick={() => { setTimeSliderEnabled(!timeSliderEnabled); setTimeSliderValue(100); setTimeSliderPlaying(false); }}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${timeSliderEnabled
                            ? 'border-[var(--color-blue)] text-[var(--color-blue)] bg-[var(--color-blue)]/10'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white'
                        }`}
                        title="Toggle time slider"
                    >
                        <Clock size={10} />
                        Time Travel
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button
                        onClick={() => { setInitialized(false); buildGraphFromExistingData(); }}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                        title="Refresh graph"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Time Slider */}
            <AnimatePresence>
                {timeSliderEnabled && dateRange.min && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/30"
                    >
                        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center gap-3">
                            <button
                                onClick={() => { setTimeSliderValue(0); setTimeSliderPlaying(false); }}
                                className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                                title="Reset to start"
                            >
                                <SkipBack size={14} />
                            </button>
                            <button
                                onClick={() => setTimeSliderPlaying(!timeSliderPlaying)}
                                className={`p-1.5 rounded-lg border transition-colors ${timeSliderPlaying
                                    ? 'border-[var(--color-blue)] bg-[var(--color-blue)]/10 text-[var(--color-blue)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
                                }`}
                                title={timeSliderPlaying ? 'Pause' : 'Play growth animation'}
                            >
                                {timeSliderPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={timeSliderValue}
                                onChange={(e) => { setTimeSliderValue(Number(e.target.value)); setTimeSliderPlaying(false); }}
                                className="flex-1 h-1.5 appearance-none bg-[var(--color-bg-dark)] rounded-full cursor-pointer accent-[var(--color-blue)]"
                            />
                            <span className="text-[10px] text-[var(--color-text-secondary)] font-mono min-w-[80px] text-right">
                                {timeSliderDate ? new Date(timeSliderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)]">
                                {stats.totalNodes} nodes
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Traced Concept Banner */}
            {tracedConcept && (
                <div className="border-b border-[var(--color-yellow)]/30 bg-[var(--color-yellow)]/5">
                    <div className="max-w-[1800px] mx-auto px-4 py-1.5 flex items-center gap-2 text-xs">
                        <span className="text-[var(--color-yellow)]">Tracing:</span>
                        <span className="text-white font-semibold">{tracedConcept}</span>
                        <button
                            onClick={() => setTracedConcept(null)}
                            className="ml-auto text-[var(--color-text-muted)] hover:text-white"
                        >
                            ✕ Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/30">
                <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search nodes… (exact match zooms in)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-9 py-1.5 text-sm rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-blue)]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    const q = searchQuery.toLowerCase();
                                    const match = (graphData.nodes as GraphNode[]).find(
                                        (n) => n.label.toLowerCase().includes(q)
                                    );
                                    if (match && graphRef.current) {
                                        if (is3D) {
                                            graphRef.current.cameraPosition?.(
                                                { x: match.x ?? 0, y: match.y ?? 0, z: 200 },
                                                { x: match.x ?? 0, y: match.y ?? 0, z: 0 },
                                                1200
                                            );
                                        } else {
                                            graphRef.current.centerAt?.(match.x ?? 0, match.y ?? 0, 800);
                                            graphRef.current.zoom?.(4, 800);
                                        }
                                        selectKnowledgeNode(match.id);
                                    }
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-blue)] transition-colors"
                                title="Zoom to node"
                            >
                                <Crosshair size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showFilters
                            ? 'border-[var(--color-blue)] text-[var(--color-blue)] bg-[var(--color-blue)]/10'
                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
                            }`}
                    >
                        <Filter size={12} />
                        Filters
                    </button>

                    {/* Node type toggles */}
                    <div className="flex items-center gap-1">
                        {(['word', 'concept', 'skill'] as const).map((type) => {
                            const active = knowledgeFilters.nodeTypes.includes(type);
                            const icons = { word: BookOpen, concept: Brain, skill: TrendingUp };
                            const colors = { word: 'var(--color-green)', concept: 'var(--color-blue)', skill: 'var(--color-purple)' };
                            const Icon = icons[type];
                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        const current = knowledgeFilters.nodeTypes;
                                        setKnowledgeFilter(
                                            'nodeTypes',
                                            active
                                                ? current.filter((t) => t !== type)
                                                : [...current, type]
                                        );
                                    }}
                                    className={`p-1.5 rounded-lg border transition-colors ${active
                                        ? 'border-[var(--color-border)] bg-[var(--color-bg-hover)]'
                                        : 'border-transparent opacity-30'
                                        }`}
                                    title={type}
                                >
                                    <Icon size={14} style={{ color: active ? colors[type] : undefined }} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Expanded filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-3 flex flex-wrap gap-2">
                                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-full mb-1">Categories</p>
                                {allCategories.map((cat) => {
                                    const active = knowledgeFilters.categories.length === 0 || knowledgeFilters.categories.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                const current = knowledgeFilters.categories;
                                                if (current.length === 0) {
                                                    setKnowledgeFilter('categories', [cat]);
                                                } else if (current.includes(cat)) {
                                                    const next = current.filter((c) => c !== cat);
                                                    setKnowledgeFilter('categories', next);
                                                } else {
                                                    setKnowledgeFilter('categories', [...current, cat]);
                                                }
                                            }}
                                            className={`px-2 py-1 text-[10px] rounded-full border transition-colors capitalize ${active
                                                ? 'border-[var(--color-border)] text-white bg-[var(--color-bg-hover)]'
                                                : 'border-transparent text-[var(--color-text-muted)] opacity-50'
                                                }`}
                                        >
                                            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: getCategoryColor(cat) }} />
                                            {cat}
                                        </button>
                                    );
                                })}
                                {knowledgeFilters.categories.length > 0 && (
                                    <button
                                        onClick={() => setKnowledgeFilter('categories', [])}
                                        className="px-2 py-1 text-[10px] rounded-full text-[var(--color-text-muted)] hover:text-white"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Graph Canvas */}
            <div className="relative" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 180px)' }}>
                {knowledgeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--color-bg-dark)]/80">
                        <Loader2 className="animate-spin text-[var(--color-blue)]" size={32} />
                    </div>
                )}

                {graphData.nodes.length === 0 && !knowledgeLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <Network size={48} className="text-[var(--color-text-muted)] mb-4" />
                        <h2 className="text-lg font-semibold text-white mb-2">Your Knowledge Universe Awaits</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
                            Start learning vocabulary in WordForge, log your daily learnings in the Slight Edge calendar,
                            or complete quests — every piece of knowledge will appear here as a node in your growing network.
                        </p>
                        <div className="flex gap-3">
                            <Link href="/wordforge" className="px-4 py-2 text-sm rounded-lg bg-[var(--color-green)]/20 text-[var(--color-green)] border border-[var(--color-green)]/30 hover:bg-[var(--color-green)]/30 transition-colors">
                                WordForge →
                            </Link>
                            <Link href="/goals/calendar" className="px-4 py-2 text-sm rounded-lg bg-[var(--color-blue)]/20 text-[var(--color-blue)] border border-[var(--color-blue)]/30 hover:bg-[var(--color-blue)]/30 transition-colors">
                                Slight Edge →
                            </Link>
                        </div>
                    </div>
                ) : is3D ? (
                    <ForceGraph3D
                        ref={graphRef}
                        graphData={graphData}
                        nodeLabel={(node) => (node as GraphNode).label}
                        nodeColor={(node) => (node as GraphNode).color}
                        nodeVal={(node) => (node as GraphNode).size * 0.8}
                        nodeOpacity={0.92}
                        linkColor={(link) => {
                            const l = link as unknown as GraphLink;
                            return edgeColoringEnabled ? getEdgeTypeColor(l.edgeType) : '#475569';
                        }}
                        linkOpacity={0.4}
                        linkWidth={(link) => 0.3 + (link as unknown as GraphLink).weight * 1.2}
                        onNodeClick={(node) => {
                            const gn = node as GraphNode;
                            selectKnowledgeNode(gn.id);
                        }}
                        onBackgroundClick={() => selectKnowledgeNode(null)}
                        backgroundColor="rgba(0,0,0,0)"
                        showNavInfo={false}
                        width={graphDimensions.width}
                        height={graphDimensions.height}
                    />
                ) : (
                    <ForceGraph2D
                        ref={graphRef}
                        graphData={graphData}
                        nodeCanvasObject={(node, ctx) => paintNode(node as GraphNode, ctx)}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            const n = node as GraphNode;
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(n.x || 0, n.y || 0, n.size || 6, 0, 2 * Math.PI);
                            ctx.fill();
                        }}
                        linkCanvasObject={(link, ctx) => paintLink(link as unknown as GraphLink, ctx)}
                        onNodeClick={(node) => {
                            const gn = node as GraphNode;
                            selectKnowledgeNode(gn.id);
                            startParticleFlow(gn.id);
                        }}
                        onNodeHover={(node) => setHoveredNode(node ? (node as GraphNode).id : null)}
                        onBackgroundClick={() => { selectKnowledgeNode(null); setParticleFlowNodeId(null); }}
                        onRenderFramePost={(ctx, globalScale) => onRenderFramePost(ctx, globalScale)}
                        backgroundColor="rgba(0,0,0,0)"
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}
                        warmupTicks={50}
                        cooldownTime={3000}
                        enableNodeDrag={true}
                        enableZoomInteraction={true}
                        enablePanInteraction={true}
                        width={graphDimensions.width}
                        height={graphDimensions.height}
                    />
                )}

                {/* ── Minimap ── */}
                {showMinimap && !is3D && graphData.nodes.length > 0 && (
                    <MinimapPanel
                        nodes={graphData.nodes as GraphNode[]}
                        links={graphData.links as GraphLink[]}
                        edgeColoringEnabled={edgeColoringEnabled}
                        graphRef={graphRef}
                    />
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-[var(--color-bg-card)]/90 backdrop-blur-sm rounded-lg border border-[var(--color-border)] p-3 text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Legend</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[var(--color-green)]" />
                            <span className="text-[var(--color-text-secondary)]">Words (circle)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-[var(--color-blue)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                            <span className="text-[var(--color-text-secondary)]">Concepts (hexagon)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-[var(--color-purple)]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                            <span className="text-[var(--color-text-secondary)]">Skills (diamond)</span>
                        </div>
                        {edgeColoringEnabled && (
                            <>
                                <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Edge Types</p>
                                </div>
                                {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
                                    <div key={type} className="flex items-center gap-2">
                                        <div className="w-4 h-0.5 rounded" style={{ background: color }} />
                                        <span className="text-[var(--color-text-secondary)] capitalize">{type.replace('_', ' ')}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Node Detail Panel */}
            <AnimatePresence>
                {selectedNode && (
                    <KnowledgeNodeDetail
                        node={selectedNode}
                        allNodes={knowledgeNodes}
                        edges={knowledgeEdges}
                        onClose={() => selectKnowledgeNode(null)}
                        onNavigateToNode={(id) => selectKnowledgeNode(id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="flex items-center gap-1.5 flex-shrink-0">
            {color && <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
            <span className="text-[var(--color-text-muted)]">{label}</span>
            <span className="text-white font-mono font-semibold">{value}</span>
        </div>
    );
}

// ── Minimap Panel ──
// Shows a simplified bird's-eye view of the entire graph with a viewport rectangle.
function MinimapPanel({
    nodes,
    links,
    edgeColoringEnabled,
    graphRef,
}: {
    nodes: GraphNode[];
    links: GraphLink[];
    edgeColoringEnabled: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphRef: React.RefObject<any>;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const MINIMAP_W = 180;
    const MINIMAP_H = 130;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Compute bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            if (n.x == null || n.y == null) continue;
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        }
        if (!isFinite(minX)) return;

        const padding = 30;
        minX -= padding; maxX += padding; minY -= padding; maxY += padding;
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const scaleX = MINIMAP_W / rangeX;
        const scaleY = MINIMAP_H / rangeY;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (MINIMAP_W - rangeX * scale) / 2;
        const offsetY = (MINIMAP_H - rangeY * scale) / 2;

        const toMini = (x: number, y: number) => ({
            mx: (x - minX) * scale + offsetX,
            my: (y - minY) * scale + offsetY,
        });

        // Clear
        ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

        // Draw edges
        ctx.globalAlpha = 0.2;
        for (const link of links) {
            const src = link.source as unknown as GraphNode;
            const tgt = link.target as unknown as GraphNode;
            if (src?.x == null || tgt?.x == null) continue;
            const s = toMini(src.x, src.y ?? 0);
            const t = toMini(tgt.x, tgt.y ?? 0);
            ctx.strokeStyle = edgeColoringEnabled ? getEdgeTypeColor(link.edgeType) : '#334155';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.mx, s.my);
            ctx.lineTo(t.mx, t.my);
            ctx.stroke();
        }

        // Draw nodes
        ctx.globalAlpha = 0.8;
        for (const n of nodes) {
            if (n.x == null || n.y == null) continue;
            const { mx, my } = toMini(n.x, n.y);
            ctx.fillStyle = n.color;
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(1.5, n.size * scale * 0.15), 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw viewport rectangle
        ctx.globalAlpha = 1;
        if (graphRef.current) {
            try {
                const screen2graph = graphRef.current.screen2GraphCoords;
                if (screen2graph) {
                    const topLeft = screen2graph(0, 0);
                    const bottomRight = screen2graph(
                        graphRef.current.width?.() || 800,
                        graphRef.current.height?.() || 600
                    );
                    const vtl = toMini(topLeft.x, topLeft.y);
                    const vbr = toMini(bottomRight.x, bottomRight.y);
                    const vw = Math.abs(vbr.mx - vtl.mx);
                    const vh = Math.abs(vbr.my - vtl.my);
                    ctx.strokeStyle = '#60a5fa';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(vtl.mx, vtl.my, vw, vh);
                    // Subtle fill
                    ctx.fillStyle = 'rgba(96, 165, 250, 0.06)';
                    ctx.fillRect(vtl.mx, vtl.my, vw, vh);
                }
            } catch {
                // screen2GraphCoords may not be available yet
            }
        }
    });

    const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!graphRef.current || nodes.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Compute same bounds as render
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            if (n.x == null || n.y == null) continue;
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        }
        if (!isFinite(minX)) return;
        const padding = 30;
        minX -= padding; maxX += padding; minY -= padding; maxY += padding;
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const scaleX = MINIMAP_W / rangeX;
        const scaleY = MINIMAP_H / rangeY;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (MINIMAP_W - rangeX * scale) / 2;
        const offsetY = (MINIMAP_H - rangeY * scale) / 2;

        // Reverse transform: minimap coords → graph coords
        const graphX = (clickX - offsetX) / scale + minX;
        const graphY = (clickY - offsetY) / scale + minY;

        graphRef.current.centerAt?.(graphX, graphY, 600);
    }, [nodes, graphRef]);

    return (
        <div className="absolute top-4 right-4 rounded-lg border border-[var(--color-border)] overflow-hidden shadow-lg shadow-black/30">
            <canvas
                ref={canvasRef}
                width={MINIMAP_W}
                height={MINIMAP_H}
                className="cursor-crosshair"
                onClick={handleMinimapClick}
            />
        </div>
    );
}
