'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Target, Map, Sword, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import TabShell from '@/components/TabShell';
import QuestsTab from './QuestsTab';
import ChainsTab from './ChainsTab';
import BossesTab from './BossesTab';

const TABS = [
  { id: 'quests', label: 'Quests', icon: <Target size={16} /> },
  { id: 'chains', label: 'Chains', icon: <Map size={16} /> },
  { id: 'bosses', label: 'Bosses', icon: <Sword size={16} /> },
];

export default function QuestsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'quests';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'quests');
  const { xp } = useGameStore();

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold">Quests</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-purple)]">⚡</span>
            <span className="font-bold">{xp} XP</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'quests' && <QuestsTab />}
        {activeTab === 'chains' && <ChainsTab />}
        {activeTab === 'bosses' && <BossesTab />}
      </div>
    </motion.div>
  );
}
