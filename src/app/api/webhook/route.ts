// app/api/webhook/route.ts

import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
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
  const rawHeaders = await headers();
  const sig = rawHeaders.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log('📦 Incoming event:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', (err as Error).message);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // 🔁 Central subscription handler
  async function handleSubscription(subscription: Stripe.Subscription, userId?: string) {
    if (!userId) {
      console.error('❌ Could not update subscription — missing user ID');
      return;
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (existing) {
      await db.update(users)
        .set({
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          stripeCustomerId: subscription.customer as string,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      await db.insert(users).values({
        id: userId,
        email: subscription?.metadata?.email ?? '',
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        stripeCustomerId: subscription.customer as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await updateUserSubscription(subscription); // optional if needed elsewhere
  }

  // 🎯 Handle event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('🧾 Session:', session);

      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;

      if (!subscriptionId || !userId) {
        console.error('❌ Missing subscription or userId in session');
        break;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('📦 Retrieved subscription:', subscription);

        await handleSubscription(subscription, userId);
        console.log('✅ Subscription saved in database!');
      } catch (err) {
        console.error('❌ Failed to update subscription from session:', err);
      }

      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`🔄 Event: ${event.type}`, subscription);

      const userId = subscription.metadata?.userId;

      try {
        await handleSubscription(subscription, userId);
        console.log(`✅ Subscription ${event.type} processed`);
      } catch (err) {
        console.error(`❌ Failed to handle ${event.type}:`, err);
      }

      break;
    }

    default:
      console.log(`📬 Unhandled event type: ${event.type}`);
  }

  return new NextResponse('Received', { status: 200 });
}
