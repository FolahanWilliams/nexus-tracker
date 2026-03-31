'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Brain, BookOpen, Calendar, Trophy, BarChart3, Library, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import DailyTrainingTab from './DailyTrainingTab';
import ModelCardLibrary from './ModelCardLibrary';
import WeeklyTab from './WeeklyTab';
import ChallengesTab from './ChallengesTab';
import ScoreboardTab from './ScoreboardTab';

const TABS = [
    { id: 'daily', label: 'Daily Training', icon: <Brain size={16} /> },
    { id: 'library', label: 'Model Library', icon: <BookOpen size={16} /> },
    { id: 'weekly', label: 'Weekly', icon: <Calendar size={16} /> },
    { id: 'challenges', label: 'Challenges', icon: <Trophy size={16} /> },
    { id: 'scoreboard', label: 'Scoreboard', icon: <BarChart3 size={16} /> },
];

export default function HitsPage() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'daily';
    const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'daily');

    return (
        <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Brain size={22} className="text-[var(--color-purple)]" />
                            HITS Training
                        </h1>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Horizontal Intelligence Training System</p>
                    </div>
                </div>
                <div className="max-w-5xl mx-auto px-4">
                    <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
            </div>
            <div className="max-w-5xl mx-auto px-4 py-6">
                {activeTab === 'daily' && <DailyTrainingTab />}
                {activeTab === 'library' && <ModelCardLibrary />}
                {activeTab === 'weekly' && <WeeklyTab />}
                {activeTab === 'challenges' && <ChallengesTab />}
                {activeTab === 'scoreboard' && <ScoreboardTab />}
            </div>
        </motion.div>
    );
}
