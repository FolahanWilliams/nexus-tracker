'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Check, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect, useRef, Suspense } from 'react';

function PricingContent() {
  const { user, loading: authLoading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const checkoutTriggered = useRef(false);

  const features = [
    'Unlimited Quests & Habits',
    'Full access to Mindforge AI',
    'Full access to Wordforge AI',
    'Personalized Hoot AI Strategy',
    'Epic Boss Battles & Loot',
    'Detailed Progress Analytics',
    'Cross-device Sync'
  ];

  const triggerCheckout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned:', data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  };

  // Auto-trigger checkout when redirected back from sign-in with ?checkout=true
  useEffect(() => {
    if (
      searchParams.get('checkout') === 'true' &&
      user &&
      !authLoading &&
      !checkoutTriggered.current
    ) {
      checkoutTriggered.current = true;
      // Clean up the URL
      router.replace('/pricing', { scroll: false });
      triggerCheckout();
    }
  }, [user, authLoading, searchParams]);

  const handleSubscribe = async () => {
    if (!user) {
      // Sign in, then redirect back to /pricing?checkout=true
      signIn('/pricing?checkout=true');
      return;
    }
    triggerCheckout();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col items-center py-20 px-6">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-white transition-colors">
        <ChevronLeft size={16} /> Back to Home
      </Link>

      <motion.div 
        className="text-center mb-12 mt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 text-[var(--color-purple-light)] text-xs font-bold uppercase tracking-widest mb-6">
          <Sparkles size={14} /> One Simple Subscription
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Invest in your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-blue)] via-[var(--color-purple)] to-[#f43f5e]">Potential</span>.</h1>
        <p className="text-[var(--color-text-secondary)] text-lg max-w-xl mx-auto">
          Unlock the ultimate AI-powered productivity system. Everything you need to conquer your goals, all in one tier.
        </p>
      </motion.div>

      <motion.div 
        className="w-full max-w-lg relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-[var(--color-purple)] via-[var(--color-blue)] to-[var(--color-green)] opacity-40 blur-xl -z-10 animate-gradient" style={{ backgroundSize: '200% 200%' }} />
        
        <div className="rpg-card !p-10 border-2 border-[var(--color-purple)]/50 relative overflow-hidden flex flex-col">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-purple)]/20 blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Shield className="text-[var(--color-purple)]" /> 
                Hero Tier
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">Full access to QuestFlow.</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-white">$5.99</span>
              <span className="text-sm text-[var(--color-text-muted)] block">/ month</span>
            </div>
          </div>

          <div className="bg-[var(--color-green)]/10 border border-[var(--color-green)]/20 rounded-xl p-4 flex items-center justify-center gap-3 mb-8">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-green)] animate-pulse" />
            <span className="text-sm font-bold text-[var(--color-green)]">3-Day Free Trial Included</span>
          </div>

          <div className="space-y-4 mb-10 flex-1">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--color-purple)]/20 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-[var(--color-purple-light)] font-bold" />
                </div>
                <span className="text-[var(--color-text-primary)] text-sm font-medium">{f}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)] hover:scale-[1.02] transition-transform flex items-center justify-center shadow-[0_4px_24px_rgba(167,139,250,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Start Free Trial'
            )}
          </button>
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-4">
            Cancel anytime. No commitment.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-primary)]" />}>
      <PricingContent />
    </Suspense>
  );
}
