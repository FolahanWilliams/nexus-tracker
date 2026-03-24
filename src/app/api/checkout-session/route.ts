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

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      logger.error('STRIPE_PRICE_ID is not configured', 'stripe');
      return NextResponse.json(
        { error: 'Server configuration error: missing price ID' },
        { status: 500 }
      );
    }

    const userId = user.id;
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'User email is required for checkout' },
        { status: 400 }
      );
    }

    // Check if user already has a stripe customer ID
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create a new Stripe customer if one doesn't exist
    if (!customerId) {
      const customer = await getStripeServer().customers.create({
        email,
        metadata: { supabase_uid: userId },
      });
      customerId = customer.id;

      // Save customer ID to Supabase profile
      await getSupabaseAdmin()
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create a checkout session with 3-day free trial
    const session = await getStripeServer().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
      },
      success_url: `${appUrl}/overview?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    logger.error('Checkout session error', 'stripe', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
});
