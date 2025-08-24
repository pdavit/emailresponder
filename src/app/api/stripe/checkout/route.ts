import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // avoid caching any errors

export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await req.json().catch(() => ({}));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/emailresponder?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
      client_reference_id: uid || undefined,
      customer_email: email || undefined,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 }, // if you want the 7-day trial
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("checkout create failed", err);
    return NextResponse.json(
      { error: err?.message ?? "Checkout create failed" },
      { status: 500 }
    );
  }
}
