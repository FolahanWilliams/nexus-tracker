'use client';

import LoginScreen from '@/components/LoginScreen';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/overview');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-4xl animate-pulse">✨</div>
      </div>
    );
  }

  // Pre-rendering safety
  if (user) return null;

  return <LoginScreen />;
}
