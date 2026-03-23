'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, CalendarDays, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import CheckInTab from './CheckInTab';
import SlightEdgeTab from './SlightEdgeTab';

const TABS = [
  { id: 'checkin', label: 'Daily Check-In', icon: <BookOpen size={16} /> },
  { id: 'edge', label: 'Slight Edge Log', icon: <CalendarDays size={16} /> },
];

export default function JournalPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'checkin';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'checkin');

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Daily Journal</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'checkin' && <CheckInTab />}
        {activeTab === 'edge' && <SlightEdgeTab />}
      </div>
    </motion.div>
  );
}
