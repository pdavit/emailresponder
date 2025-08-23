import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    // Reuse or create customer by email
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email,
      metadata: { firebaseUid: userId },
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: userId, // read in webhook
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error", err);
    return NextResponse.json({ error: err?.message ?? "Checkout error" }, { status: 500 });
  }
}
