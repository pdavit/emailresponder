import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { updateUserSubscription } from '@/lib/subscription';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not defined!');
    return new NextResponse('Webhook secret missing', { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('📦 Incoming event:', event.type);
  } catch (err) {
    console.error('❌ Webhook verification failed:', (err as Error).message);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  async function handleSubscription(subscription: Stripe.Subscription, userId: string) {
    if (!userId) {
      console.error('❌ No user ID provided for subscription update');
      return;
    }

    const trialEndDate =
      typeof subscription.current_period_end === 'number'
        ? new Date(subscription.current_period_end * 1000)
        : null;

    const priceId = subscription.items.data[0]?.price.id ?? '';

    const payload = {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      stripeCustomerId: String(subscription.customer),
      subscriptionEndDate: trialEndDate,
      stripePriceId: priceId,
      updatedAt: new Date(),
    };

    const existingUser = await db.query.users.findFirst({ where: eq(users.id, userId) });

    if (existingUser) {
      await db.update(users).set(payload).where(eq(users.id, userId));
    } else {
      await db.insert(users).values({
        ...payload,
        id: userId,
        email: subscription.metadata?.email ?? '',
        createdAt: new Date(),
      });
    }

    await updateUserSubscription(subscription);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;

      if (!userId || !subscriptionId) {
        console.error('❌ Missing userId or subscriptionId in session metadata');
        break;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await handleSubscription(subscription, userId);
        console.log('✅ Synced after checkout.session.completed');
      } catch (err) {
        console.error('❌ Failed to retrieve subscription:', err);
      }

      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (!userId) {
        console.error(`❌ Missing userId in ${event.type}`);
        break;
      }

      try {
        await handleSubscription(subscription, userId);
        console.log(`✅ Handled ${event.type}`);
      } catch (err) {
        console.error(`❌ Error in ${event.type} handler:`, err);
      }

      break;
    }

    default:
      console.log(`📬 Unhandled Stripe event: ${event.type}`);
  }

  return new NextResponse('Received', { status: 200 });
}
