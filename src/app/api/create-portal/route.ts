import { NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '@/lib/with-auth';
import { logger } from '@/lib/logger';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const POST = withAuth(async (_request, user) => {
  try {
    const userId = user.id;

    // Get the user's stripe customer id
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Create a Stripe customer portal session
    const session = await getStripeServer().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://questflo.vercel.app'}/overview`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    logger.error('Portal session error', 'stripe', error);
    const message = error instanceof Error ? error.message : 'Failed to create portal session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
});
