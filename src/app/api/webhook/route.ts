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
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook Error:', (err as Error).message);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  // Handle Stripe events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Payment success:', session.id);
        
        // Create or update user subscription
        if (session.customer && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customer = await stripe.customers.retrieve(session.customer as string);
          
          // Extract user ID from metadata or customer email
          const userId = session.metadata?.userId || (customer as Stripe.Customer).email;
          
          if (userId) {
            // Stripe API 2025-03-31+ deprecates subscription.current_period_end; use items.data[0].current_period_end
            const currentPeriodEnd = Array.isArray(subscription.items.data) && subscription.items.data.length > 0 ? subscription.items.data[0].current_period_end : null;
            await updateUserSubscription(
              userId,
              session.customer as string,
              session.subscription as string,
              subscription.status,
              new Date((currentPeriodEnd ?? 0) * 1000)
            );
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id);
        
        // Update user subscription in database
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const userId = (customer as Stripe.Customer).email; // Use email as user ID for now
        
        if (userId) {
          const currentPeriodEnd = Array.isArray(subscription.items.data) && subscription.items.data.length > 0 ? subscription.items.data[0].current_period_end : null;
          await updateUserSubscription(
            userId,
            subscription.customer as string,
            subscription.id,
            subscription.status,
            new Date((currentPeriodEnd ?? 0) * 1000)
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription deleted:', subscription.id);
        
        // Mark subscription as canceled in database
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const userId = (customer as Stripe.Customer).email;
        
        if (userId) {
          const currentPeriodEnd = Array.isArray(subscription.items.data) && subscription.items.data.length > 0 ? subscription.items.data[0].current_period_end : null;
          await updateUserSubscription(
            userId,
            subscription.customer as string,
            subscription.id,
            'canceled',
            new Date((currentPeriodEnd ?? 0) * 1000)
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ Payment failed:', invoice.id);
        
        // Update subscription status to past_due
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const userId = (customer as Stripe.Customer).email;
          
          if (userId) {
            const currentPeriodEnd = Array.isArray(subscription.items.data) && subscription.items.data.length > 0 ? subscription.items.data[0].current_period_end : null;
            await updateUserSubscription(
              userId,
              subscription.customer as string,
              subscription.id,
              subscription.status,
              new Date((currentPeriodEnd ?? 0) * 1000)
            );
          }
        }
        break;
      }

      default:
        console.log('Unhandled event:', event.type);
    }

    return new NextResponse('Event received', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}
