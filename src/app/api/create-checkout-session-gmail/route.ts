// src/app/api/create-checkout-session-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { isStripeActive } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// HMAC verification (email|ts) using ER_SHARED_SECRET from Apps Script & server
function verify(email: string, ts: string, sig: string) {
  const age = Math.floor(Date.now() / 1000) - parseInt(ts || "0", 10);
  if (!ts || !sig || age > 300) return false; // 5 min
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
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    const ts = url.searchParams.get("ts") || "";
    const sig = url.searchParams.get("sig") || "";

    if (!email || !verify(email, ts, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If already active/trialing, take them back to the app immediately.
    if (await isStripeActive(email)) {
      const base =
        process.env.NEXT_PUBLIC_APP_BASE_URL || "https://app.skyntco.com";
      return NextResponse.redirect(`${base}/emailresponder`, { status: 303 });
    }

    // Create Checkout session (no customer_creation here — not supported for subscription mode)
    const base =
      process.env.NEXT_PUBLIC_APP_BASE_URL || "https://app.skyntco.com";
    const priceId =
      process.env.STRIPE_PRICE_ID_EMAILRESPONDER || "price_xxx_replace_me";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      // If you want a 7-day trial and it’s NOT set on the Price, uncomment:
      // subscription_data: { trial_period_days: 7 },

      success_url: `${base}/thank-you?redirect=/emailresponder&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?canceled=1`,
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    console.error("create-checkout-session-gmail error:", err);
    return NextResponse.json(
      {
        error: "Internal error",
        details:
          err?.message ||
          "An error occurred with our connection to Stripe. Request was retried.",
      },
      { status: 500 }
    );
  }
}
