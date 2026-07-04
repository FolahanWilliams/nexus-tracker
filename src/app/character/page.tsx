'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Sparkles, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TabShell from '@/components/TabShell';
import ProfileTab from './ProfileTab';
import InventoryTab from './InventoryTab';

const TABS = [
  { id: 'profile', label: 'Profile & Skills', icon: <User size={16} /> },
  { id: 'inventory', label: 'Items & Shop', icon: <Sparkles size={16} /> },
];

function CharacterPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'profile');

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Character</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <TabShell tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'inventory' && <InventoryTab />}
      </div>
    </motion.div>
  );
}

// useSearchParams requires a Suspense boundary for static prerendering.
export default function CharacterPage() {
    return (
        <Suspense fallback={null}>
            <CharacterPageContent />
        </Suspense>
    );
}
