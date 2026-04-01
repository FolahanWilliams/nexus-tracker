'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Brain, FileText, BarChart3, BookOpen, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import SATDailyTab from './SATDailyTab';
import SATPracticeTest from './SATPracticeTest';
import SATProgressTab from './SATProgressTab';
import SATVocabBank from './SATVocabBank';

const TABS = [
    { id: 'daily', label: 'Daily Training', icon: <Brain size={16} /> },
    { id: 'tests', label: 'Practice Tests', icon: <FileText size={16} /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 size={16} /> },
    { id: 'vocab', label: 'Vocab Bank', icon: <BookOpen size={16} /> },
];

export default function SATPage() {
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
                            <GraduationCap size={22} className="text-[var(--color-blue)]" />
                            SAT Prep
                        </h1>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Digital SAT Learning Mode</p>
                    </div>
                </div>
                <div className="max-w-5xl mx-auto px-4">
                    <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
            </div>
            <div className="max-w-5xl mx-auto px-4 py-6">
                {activeTab === 'daily' && <SATDailyTab />}
                {activeTab === 'tests' && <SATPracticeTest />}
                {activeTab === 'progress' && <SATProgressTab />}
                {activeTab === 'vocab' && <SATVocabBank />}
            </div>
        </motion.div>
    );
}
