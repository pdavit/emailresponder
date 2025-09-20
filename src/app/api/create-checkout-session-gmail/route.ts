// src/app/api/create-checkout-session-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------- Signed link verification -------------------------- */

function hmacOk(email: string, ts: string, sigHex: string): boolean {
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;

  // Reject links older than 5 minutes (and future timestamps)
  const ageSec = Math.floor(Date.now() / 1000) - tsNum;
  if (ageSec < 0 || ageSec > 300) return false;

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest("hex");

  // Compare constant-time, equal-length, as bytes
  let a: Buffer, b: Buffer;
  try {
    a = Buffer.from(expectedHex, "hex");
    b = Buffer.from(sigHex, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* ----------------------------------- GET ----------------------------------- */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim();
    const ts = (searchParams.get("ts") || "").trim();
    const sig = (searchParams.get("sig") || "").trim();

    if (!email || !ts || !sig || !hmacOk(email, ts, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required configuration
    const env = {
      sk: (process.env.STRIPE_SECRET_KEY ?? "").trim(),
      priceId: (process.env.STRIPE_PRICE_ID ?? "").trim(),
      origin: (process.env.APP_ORIGIN ?? "").trim(),
    };
    const missing = Object.entries(env)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      return NextResponse.json(
        { error: "Server not configured", missing },
        { status: 500 }
      );
    }

    const trialDaysRaw = (process.env.STRIPE_TRIAL_DAYS ?? "7").trim();
    const trialDays = Number(trialDaysRaw);
    const includeTrial =
      Number.isFinite(trialDays) && trialDays > 0 ? trialDays : undefined;

    const stripe = new Stripe(env.sk /* use library default apiVersion */);

    // Reuse existing customer for this email; otherwise create one
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email,
        metadata: { gmailEmail: email },
      });
      customerId = created.id;
    }

    // Create subscription checkout (no customer_creation — that’s for "payment" mode only)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: env.priceId, quantity: 1 }],
      allow_promotion_codes: true,

      ...(includeTrial
        ? { subscription_data: { trial_period_days: includeTrial } }
        : {}),

      success_url: `${env.origin}/thank-you?redirect=${encodeURIComponent(
        "/emailresponder"
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.origin}/emailresponder?checkout=cancelled`,

      client_reference_id: `gmail:${email}`,
      metadata: { gmailEmail: email },
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
