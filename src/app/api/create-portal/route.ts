import { NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withAuth } from '@/lib/with-auth';
import { logger } from '@/lib/logger';

export const POST = withAuth(async (_request, user) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      logger.error('NEXT_PUBLIC_APP_URL is not configured', 'stripe');
      return NextResponse.json(
        { error: 'Server configuration error: missing app URL' },
        { status: 500 }
      );
    }

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
      return_url: `${appUrl}/overview`,
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
