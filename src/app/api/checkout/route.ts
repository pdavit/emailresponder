import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1Rm2GKErQ2xDMCCbVNGmK7wI', // Replace with your actual price ID
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: 'https://app.skyntco.com/success',
      cancel_url: 'https://app.skyntco.com/cancel',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Something went wrong creating session' },
      { status: 500 }
    );
  }
} 