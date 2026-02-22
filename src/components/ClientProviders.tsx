'use client';

import AuthProvider from '@/components/AuthProvider';
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
            {children}
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
