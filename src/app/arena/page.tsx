'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Swords, Zap, Search, ChevronLeft, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import BattleArena from './BattleArena';
import GauntletArena from './GauntletArena';
import MysteryArena from './MysteryArena';
import ArenaStats from './ArenaStats';

const TABS = [
  { id: 'battle', label: 'Word Battle', icon: <Swords size={16} /> },
  { id: 'gauntlet', label: 'Gauntlet', icon: <Zap size={16} /> },
  { id: 'mystery', label: 'Mystery', icon: <Search size={16} /> },
  { id: 'stats', label: 'Stats', icon: <Trophy size={16} /> },
];

export default function ArenaPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'battle';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'battle');

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Arena</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'battle' && <BattleArena />}
        {activeTab === 'gauntlet' && <GauntletArena />}
        {activeTab === 'mystery' && <MysteryArena />}
        {activeTab === 'stats' && <ArenaStats />}
      </div>
    </motion.div>
  );
}
