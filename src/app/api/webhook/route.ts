// app/api/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription } from '@/lib/subscription';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
 const headersList = await headers();
 const sig = headersList.get('stripe-signature')!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', (err as Error).message);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      console.log('✅ Subscription successful:', event.id);
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateUserSubscription(subscription);
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await updateUserSubscription(sub);
      break;
    }

    default:
      console.log(`📬 Unhandled event type: ${event.type}`);
  }

  return new NextResponse('Received', { status: 200 });
}
