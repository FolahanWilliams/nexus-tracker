'use client';

import { useGameStore } from '@/store/useGameStore';
import { BarChart3, PieChart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AnalyticsDashboard() {
    const { tasks } = useGameStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Process Data for XP/Day (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const xpData = last7Days.map(date => {
        const xpInDay = tasks
            .filter(t => t.completed && t.completedAt?.startsWith(date))
            .reduce((sum, t) => sum + t.xpReward, 0);
        return { date: date.slice(5), xp: xpInDay }; // MM-DD
    });

    // Process Data for Difficulty Distribution
    const difficultyCounts = tasks.filter(t => t.completed).reduce((acc, t) => {
        acc[t.difficulty] = (acc[t.difficulty] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = [
        { name: 'Easy', value: difficultyCounts['Easy'] || 0, color: '#4ade80' },   // Green
        { name: 'Medium', value: difficultyCounts['Medium'] || 0, color: '#60a5fa' }, // Blue
        { name: 'Hard', value: difficultyCounts['Hard'] || 0, color: '#f97316' },     // Orange
        { name: 'Epic', value: difficultyCounts['Epic'] || 0, color: '#a855f7' },     // Purple
    ].filter(d => d.value > 0);

    if (tasks.filter(t => t.completed).length === 0) {
        return (
            <div className="glass-panel p-6 mt-8 text-center text-gray-500">
                <h2 className="text-xl font-semibold mb-2 text-white flex items-center justify-center gap-2">
                    <BarChart3 /> ANALYTICS LOCOCKED
                </h2>
                <p>Complete quests to unlock productivity insights.</p>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 mt-8 border-cyan-500/20">
            <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                <BarChart3 className="text-cyan-400" />
                <span>NEURAL ANALYTICS</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* XP Trend Chart */}
                <div className="h-64">
                    <h3 className="text-sm text-gray-400 mb-4 text-center">XP Velocity (7 Days)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={xpData}>
                            <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="xp" fill="#00dbb8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Difficulty Distribution */}
                <div className="h-64 flex flex-col items-center">
                    <h3 className="text-sm text-gray-400 mb-4 text-center">Quest Difficulty Spread</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </RePieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center flex-wrap">
                        {pieData.map(d => (
                            <div key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                {d.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
