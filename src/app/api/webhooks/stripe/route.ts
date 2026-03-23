import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Disable Next.js body parsing so Stripe can verify the raw body
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;

  try {
    event = getStripeServer().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Webhook signature verification failed: ${message}`, 'stripe');
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Get subscription details to check status
        const subscription = await getStripeServer().subscriptions.retrieve(subscriptionId);

        await getSupabaseAdmin()
          .from('profiles')
          .update({
            subscription_status: subscription.status, // 'trialing', 'active', etc.
          })
          .eq('stripe_customer_id', customerId);

        logger.info(`Checkout completed for customer ${customerId}, status: ${subscription.status}`, 'stripe');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        await getSupabaseAdmin()
          .from('profiles')
          .update({
            subscription_status: subscription.status,
          })
          .eq('stripe_customer_id', customerId);

        logger.info(`Subscription updated for customer ${customerId}, status: ${subscription.status}`, 'stripe');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        await getSupabaseAdmin()
          .from('profiles')
          .update({
            subscription_status: 'canceled',
          })
          .eq('stripe_customer_id', customerId);

        logger.info(`Subscription canceled for customer ${customerId}`, 'stripe');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        await getSupabaseAdmin()
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_customer_id', customerId);

        logger.info(`Payment failed for customer ${customerId}`, 'stripe');
        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`, 'stripe');
    }
  } catch (error: unknown) {
    logger.error('Webhook handler error', 'stripe', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
