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
  const rawHeaders = await req.headers(); // or headers() if it's a utility function
  const sig = rawHeaders.get("stripe-signature");
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log('📦 Incoming event:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', (err as Error).message);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // 🔄 Central subscription update
  async function handleSubscription(subscription: Stripe.Subscription, userId?: string) {
    if (!userId) {
      console.error('❌ Missing user ID for subscription update');
      return;
    }

    const trialEndDate = new Date(subscription.current_period_end * 1000);
    const priceId = subscription.items.data[0]?.price.id ?? '';

    console.log("📥 Saving to DB:", {
      userId,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      stripeCustomerId: subscription.customer,
      subscriptionEndDate: trialEndDate,
      stripePriceId: priceId,
    });

    const existingUser = await db.query.users.findFirst({ where: eq(users.id, userId) });

    if (existingUser) {
      await db.update(users)
        .set({
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          stripeCustomerId: subscription.customer as string,
          subscriptionEndDate: trialEndDate,
          stripePriceId: priceId,
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
        subscriptionEndDate: trialEndDate,
        stripePriceId: priceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await updateUserSubscription(subscription); // optional
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;

      if (!subscriptionId || !userId) {
        console.error('❌ Missing subscription or userId in session metadata');
        break;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await handleSubscription(subscription, userId);
        console.log('✅ Subscription synced from checkout.session.completed');
      } catch (err) {
        console.error('❌ Failed during session sync:', err);
      }

      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      try {
        await handleSubscription(subscription, userId);
        console.log(`✅ Subscription ${event.type} handled`);
      } catch (err) {
        console.error(`❌ Error handling ${event.type}:`, err);
      }

      break;
    }

    default:
      console.log(`📬 Unhandled event type: ${event.type}`);
  }

  return new NextResponse('Received', { status: 200 });
}
