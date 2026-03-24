'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'active' | 'inactive'>('loading');

  useEffect(() => {
    if (authLoading || !user) return;

    const checkSubscription = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();

        const sub = profile?.subscription_status;
        if (sub === 'active' || sub === 'trialing' || sub === 'access') {
          setStatus('active');
        } else {
          setStatus('inactive');
          router.replace('/pricing');
        }
      } catch (error) {
        // Log the failure so it's visible in monitoring, but don't silently
        // grant access — treat unknown subscription state as inactive so
        // users aren't accidentally given free access on API errors.
        logger.error('Subscription check failed', 'subscription', error);
        setStatus('inactive');
        router.replace('/pricing');
      }
    };

    checkSubscription();
  }, [user, authLoading, router]);

  // Not signed in — pass through, overview page handles auth redirect
  if (!authLoading && !user) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--color-purple)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)] text-sm">Loading your realm...</p>
        </div>
      </div>
    );
  }

  if (status === 'inactive') {
    // Redirecting to pricing — show empty while redirect happens
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--color-purple)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)] text-sm">Redirecting to subscribe...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
