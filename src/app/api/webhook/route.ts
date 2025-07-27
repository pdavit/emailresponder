// app/api/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription } from '@/lib/subscription';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
 const body = await req.text();
 const sig = (await headers()).get('stripe-signature')!;

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
    console.log('🧾 Session object:', session);

    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        console.log('📦 Retrieved subscription:', subscription);

        await updateUserSubscription(subscription);
        console.log('✅ Subscription saved in database!');
      } catch (error) {
        console.error('❌ Failed to update subscription:', error);
      }
    } else {
      console.warn('⚠️ No subscription found in checkout session.');
    }

    break;
  }

  case 'customer.subscription.updated':
  case 'customer.subscription.deleted': {
    const subscription = event.data.object as Stripe.Subscription;
    console.log(`🔄 Subscription ${event.type} event received`, subscription);

    try {
      await updateUserSubscription(subscription);
      console.log('✅ Subscription status updated in DB');
    } catch (error) {
      console.error('❌ Error updating subscription on update/delete:', error);
    }

    break;
  }

   default:
    console.log(`📬 Unhandled event type: ${event.type}`);
  }

  return new NextResponse('Received', { status: 200 }); // ✅ Add this return inside POST

}