'use client';

import Navigation from '@/components/Navigation';
import MobileNavigation from '@/components/MobileNavigation';
import LevelUpModal from '@/components/LevelUpModal';
import SoundManager from '@/components/SoundManager';
import ConfettiManager from '@/components/ConfettiManager';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navigation />
      <MobileNavigation />
      
      <main className="lg:ml-72 pb-20 lg:pb-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      <LevelUpModal />
      <SoundManager />
      <ConfettiManager />
    </div>
  );
}
