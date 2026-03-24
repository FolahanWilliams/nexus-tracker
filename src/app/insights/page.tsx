'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Network, GitBranch, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import KnowledgeTab from './KnowledgeTab';
import GrowthTab from './GrowthTab';

const TABS = [
  { id: 'knowledge', label: 'Knowledge Graph', icon: <Network size={16} /> },
  { id: 'growth', label: 'Growth Web', icon: <GitBranch size={16} /> },
];

export default function InsightsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'knowledge';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'knowledge');

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Insights</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'knowledge' && <KnowledgeTab />}
        {activeTab === 'growth' && <GrowthTab />}
      </div>
    </motion.div>
  );
}
