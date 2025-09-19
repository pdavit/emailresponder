// app/api/create-checkout-session-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function verify(email: string, ts: string, sig: string) {
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (age > 300) return false; // 5 minutes
  const h = crypto.createHmac("sha256", process.env.ER_SHARED_SECRET!);
  h.update(`${email}|${ts}`);
  const expected = h.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") || "";
  const ts = searchParams.get("ts") || "";
  const sig = searchParams.get("sig") || "";

  if (!email || !verify(email, ts, sig)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    customer_email: email,
    client_reference_id: email,
    subscription_data: { trial_period_days: 7 }, // 7-day free trial
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gmail/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gmail/cancel`,
    allow_promotion_codes: false,
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
