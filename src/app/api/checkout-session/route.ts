import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
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
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://questflo.vercel.app'}/overview?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://questflo.vercel.app'}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error('Checkout session error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
