// src/app/api/create-checkout-session-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs"; // Stripe requires Node, not Edge

/* ------------------------------ Helpers ------------------------------ */

function env(name: string): string {
  // Trim to avoid "Invalid character in header content [Authorization]" from stray spaces
  return (process.env[name] ?? "").trim();
}

function verify(email: string, ts: string, sig: string): boolean {
  // Allow 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (!ts || !sig || isNaN(Number(ts)) || age > 300 || age < -60) return false;

  const h = crypto.createHmac("sha256", env("ER_SHARED_SECRET"));
  h.update(`${email}|${ts}`);
  const expected = h.digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

/* ------------------------------ Stripe ------------------------------- */

// Do NOT pin apiVersion here; using library default avoids type drift during upgrades.
const stripeSecret = env("STRIPE_SECRET_KEY");
const stripe = new Stripe(stripeSecret);

/* --------------------------------- GET -------------------------------- */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    const ts = (url.searchParams.get("ts") || "").trim();
    const sig = (url.searchParams.get("sig") || "").trim();

    if (!email || !verify(email, ts, sig)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const priceId = env("STRIPE_PRICE_ID");
    if (!priceId) {
      console.error("Missing STRIPE_PRICE_ID");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const origin =
      env("NEXT_PUBLIC_APP_ORIGIN") ||
      `${url.protocol}//${url.host}`; // fallback to current origin

    const successUrl =
      `${origin}/thank-you?redirect=${encodeURIComponent("/emailresponder")}` +
      `&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`;
    const cancelUrl = `${origin}/thank-you?redirect=${encodeURIComponent("/emailresponder")}`;

    // Reuse an existing customer if we can find one by email
    let customerId: string | undefined;
    try {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data[0]) customerId = existing.data[0].id;
    } catch (e) {
      // Non-fatal; we can still create the session with customer_creation
      console.warn("customers.list failed; continuing without explicit customer:", e);
    }

    // Build session params
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { app: "emailresponder", email },
      },
    };

    if (customerId) {
      params.customer = customerId;
    } else {
      params.customer_creation = "always";
      params.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(params);

    if (!session.url) {
      console.error("Stripe session created without a URL", session.id);
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    // 303 redirect so Gmail opens Stripe Checkout directly
    return NextResponse.redirect(session.url, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    // Log full error for Vercel logs; return safe message to client
    console.error("create-checkout-session-gmail error:", err);
    const message =
      err && err.message ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Internal error", details: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
