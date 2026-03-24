'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Library, Brain, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import VocabularyTab from './VocabularyTab';
import ChallengesTab from './ChallengesTab';

const TABS = [
  { id: 'vocabulary', label: 'Vocabulary', icon: <Library size={16} /> },
  { id: 'challenges', label: 'Challenges', icon: <Brain size={16} /> },
];

export default function ForgePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'vocabulary';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'vocabulary');

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Forge</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'vocabulary' && <VocabularyTab />}
        {activeTab === 'challenges' && <ChallengesTab />}
      </div>
    </motion.div>
  );
}
