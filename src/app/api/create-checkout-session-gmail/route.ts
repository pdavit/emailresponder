// src/app/api/create-checkout-session-gmail/route.ts
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
  try {
    const sp = new URL(req.url).searchParams;
    const email = sp.get("email") || "";
    const ts = sp.get("ts") || "";
    const sig = sp.get("sig") || "";

    if (!email || !ts || !sig || !verify(email, ts, sig)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const priceId =
      process.env.STRIPE_PRICE_ID_GMAIL || process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error("Missing STRIPE_PRICE_ID_GMAIL / STRIPE_PRICE_ID.");
      return NextResponse.json(
        { error: "Server not configured: missing price id" },
        { status: 500 }
      );
    }

    // Find or create a customer for this email
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ?? (await stripe.customers.create({ email }));

    const base = process.env.APP_URL || "https://app.skyntco.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 },
      success_url: `${base}/emailresponder/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/emailresponder/canceled`,
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    console.error("create-checkout-session-gmail error:", err);
    return NextResponse.json(
      { error: "Internal error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
