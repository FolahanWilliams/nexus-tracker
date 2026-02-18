import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import LevelUpModal from '@/components/LevelUpModal';
import SoundManager from '@/components/SoundManager';
import ConfettiManager from '@/components/ConfettiManager';
import ToastContainer from '@/components/ToastContainer';
import Onboarding from '@/components/Onboarding';
import XPFloat from '@/components/XPFloat';
import StreakCelebration from '@/components/StreakCelebration';
import DailyIntention from '@/components/DailyIntention';
import ErrorBoundary from '@/components/ErrorBoundary';
import SkipLink from '@/components/SkipLink';

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'QuestFlow - AI Productivity RPG',
  description: 'A gamified AI productivity tracker with RPG elements',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QuestFlow',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#8b5cf6',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={nunito.className}>
        <ErrorBoundary>
          <SkipLink />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
          <Onboarding />
          <LevelUpModal />
          <SoundManager />
          <ConfettiManager />
          <ToastContainer />
          <XPFloat />
          <StreakCelebration />
          <DailyIntention />
        </ErrorBoundary>
      </body>
    </html>
  );
}
