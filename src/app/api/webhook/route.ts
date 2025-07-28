// app/api/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription } from '@/lib/subscription'; // Assuming this function handles upsert logic

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  // 1. Validate environment secret
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not defined!');
    return new NextResponse('Webhook secret missing', { status: 500 });
  }

  const body = await req.text();
  const signature = headers().get('stripe-signature'); // Directly get the header

  // 2. Verify Stripe signature
  let event: Stripe.Event;
  try {
    if (!signature) {
      throw new Error('Stripe-Signature header missing.');
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`📦 Incoming Stripe event: ${event.type} (ID: ${event.id})`);
    // console.log('🧠 Full event object:', JSON.stringify(event, null, 2)); // Uncomment for detailed debugging
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${(err as Error).message}`);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // 3. Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`✅ Checkout session completed: ${session.id}`);

        // Only proceed if it's a subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            console.log(`📦 Retrieved subscription for checkout session: ${subscription.id}`);
            // This is primarily for initial setup if customer.subscription.created hasn't fired yet
            // or as a fallback. updateUserSubscription should be idempotent.
            await updateUserSubscription(subscription);
            console.log('🎉 User subscription status updated from checkout session!');
          } catch (error) {
            console.error(`❌ Error retrieving or updating subscription from checkout session ${session.id}:`, error);
          }
        } else {
          console.log(`ℹ️ Checkout session ${session.id} is not a subscription or has no subscription object.`);
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`⭐ New subscription created: ${subscription.id}`);
        // This is the definitive event for a subscription being created.
        // `updateUserSubscription` should create the record if it doesn't exist.
        await updateUserSubscription(subscription);
        console.log('✅ Subscription successfully saved/updated in database!');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🔄 Subscription updated: ${subscription.id} (Status: ${subscription.status})`);
        // This handles status changes, plan changes, payment failures, renewals, etc.
        await updateUserSubscription(subscription);
        console.log('✅ Subscription status successfully updated in database!');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🗑️ Subscription deleted: ${subscription.id}`);
        // This handles cancellations or deletions.
        await updateUserSubscription(subscription); // updateUserSubscription should mark as cancelled/deleted
        console.log('✅ Subscription successfully marked as deleted/cancelled in database!');
        break;
      }

      default:
        console.log(`📬 Unhandled event type: ${event.type}`);
    }
  } catch (processorError) {
    // Catch errors specifically from within the event processing logic
    console.error(`❌ Error processing Stripe event ${event.type} (ID: ${event.id}):`, processorError);
    // You might want to return a 500 here if a critical internal error occurred during processing,
    // although Stripe will retry. A 200 often implies "received and handled."
    return new NextResponse('Error processing event', { status: 500 });
  }

  // 4. Acknowledge receipt to Stripe
  return new NextResponse('Received', { status: 200 });
}