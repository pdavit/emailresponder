import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  let event: Stripe.Event;

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Dev mode: Skipping Stripe signature verification');
      event = JSON.parse(rawBody) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    }
  } catch (err) {
    console.error('❌ Webhook Error:', (err as Error).message);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.customer && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customer = await stripe.customers.retrieve(session.customer as string);
          const userId = session.metadata?.userId || (customer as Stripe.Customer).email;

          if (userId) {
            const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? 0;

            await updateUserSubscription(userId, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: subscription.items.data[0]?.price.id || '',
              stripeCurrentPeriodEnd: currentPeriodEnd,
            });
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const userId = (customer as Stripe.Customer).email;

        if (userId) {
          const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? 0;

          await updateUserSubscription(userId, {
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id || '',
            stripeCurrentPeriodEnd: currentPeriodEnd,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const userId = (customer as Stripe.Customer).email;

        if (userId) {
          const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? 0;

          await updateUserSubscription(userId, {
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id || '',
            stripeCurrentPeriodEnd: currentPeriodEnd,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
const subscriptionId = invoice.subscription ?? null;
  
if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const userId = (customer as Stripe.Customer).email;

    if (userId) {
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? 0;

      await updateUserSubscription(userId, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0]?.price.id || '',
        stripeCurrentPeriodEnd: currentPeriodEnd,
      });
    }
  }
  break;
}

      default:
        console.log('Unhandled Stripe event type:', event.type);
    }

    return new NextResponse('Event received', { status: 200 });
  } catch (error) {
    console.error('🚨 Error processing event:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}
