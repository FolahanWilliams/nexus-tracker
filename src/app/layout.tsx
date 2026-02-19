import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import SkipLink from '@/components/SkipLink';
import ClientProviders from '@/components/ClientProviders';

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
            <ClientProviders>
              {children}
            </ClientProviders>
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
