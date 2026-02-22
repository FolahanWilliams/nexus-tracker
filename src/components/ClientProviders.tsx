'use client';

import AuthProvider from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import MobileNavigation from '@/components/MobileNavigation';
import LevelUpModal from '@/components/LevelUpModal';
import SoundManager from '@/components/SoundManager';
import ConfettiManager from '@/components/ConfettiManager';
import ToastContainer from '@/components/ToastContainer';
import Onboarding from '@/components/Onboarding';
import XPFloat from '@/components/XPFloat';
import StreakCelebration from '@/components/StreakCelebration';
import DailyIntention from '@/components/DailyIntention';
import QuickAdd from '@/components/QuickAdd';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Navigation />
            <MobileNavigation />
            <div className="lg:ml-64 pb-20 lg:pb-0">
                {children}
            </div>
            <Onboarding />
            <LevelUpModal />
            <SoundManager />
            <ConfettiManager />
            <ToastContainer />
            <XPFloat />
            <StreakCelebration />
            <DailyIntention />
            <QuickAdd />
        </AuthProvider>
    );
}
