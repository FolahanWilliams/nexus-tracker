'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Flag, BarChart3, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import GoalsTab from './GoalsTab';
import AnalyticsTab from './AnalyticsTab';

const TABS = [
  { id: 'goals', label: 'Goals', icon: <Flag size={16} /> },
  { id: 'analytics', label: 'Stats & Records', icon: <BarChart3 size={16} /> },
];

export default function ProgressPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'goals';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'goals');

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Progress</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </motion.div>
  );
}
