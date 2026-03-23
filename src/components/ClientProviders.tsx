'use client';

import { usePathname } from 'next/navigation';
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
import HootFAB from '@/components/HootFAB';
import BackgroundTimerManager from '@/components/BackgroundTimerManager';
import SubscriptionGate from '@/components/SubscriptionGate';
import PageTransition from '@/components/PageTransition';

const PUBLIC_ROUTES = ['/', '/pricing', '/login', '/wallpaper'];

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // On public routes, render children without the app shell
    if (isPublicRoute) {
        return (
            <AuthProvider>
                {children}
                <ToastContainer />
            </AuthProvider>
        );
    }

    return (
        <AuthProvider>
            <SubscriptionGate>
                <Navigation />
                <MobileNavigation />
                <div className="lg:ml-64 pb-20 lg:pb-0">
                    <PageTransition>
                        {children}
                    </PageTransition>
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
                <HootFAB />
                <BackgroundTimerManager />
            </SubscriptionGate>
        </AuthProvider>
    );
}
