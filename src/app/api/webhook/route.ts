import { buffer } from 'micro';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await buffer(req.body as any);
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

  // ✅ Handle Stripe events here
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('✅ Payment success:', event.data.object);
      break;
    case 'invoice.payment_failed':
      console.log('❌ Payment failed:', event.data.object);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      console.log('🔄 Subscription event:', event.data.object);
      break;
    default:
      console.log('Unhandled event:', event.type);
  }

  return new NextResponse('Event received', { status: 200 });
}
