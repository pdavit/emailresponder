// src/app/api/create-checkout-session-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

/** Edge/runtime flags (fewer surprises for webhooks/Stripe calls). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ----------------------------- HMAC verification ---------------------------- */

function verify(email: string, ts: string, sig: string): boolean {
  // ts sanity
  const tsNum = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;

  // 5-minute freshness window
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false;

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest("hex");

  // Constant-time, equal-length comparison on bytes
  let a: Buffer, b: Buffer;
  try {
    a = Buffer.from(expectedHex, "hex");
    b = Buffer.from(sig, "hex");
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

/* --------------------------------- Handler --------------------------------- */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "";
    const ts    = searchParams.get("ts")    || "";
    const sig   = searchParams.get("sig")   || "";

    if (!email || !ts || !sig || !verify(email, ts, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Strong env validation with helpful details for logs
    const required = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "APP_ORIGIN"];
    const missing = required.filter(
      (k) => !process.env[k] || String(process.env[k]).trim() === ""
    );
    if (missing.length) {
      console.error("Missing envs:", missing);
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const sk       = (process.env.STRIPE_SECRET_KEY ?? "").trim();
    const priceId  = (process.env.STRIPE_PRICE_ID   ?? "").trim();
    const origin   = (process.env.APP_ORIGIN        ?? "").trim();

    const stripe = new Stripe(sk /* use library default apiVersion */);

    // Reuse existing customer by email (if any); otherwise create a new one
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const c = await stripe.customers.create({
        email,
        metadata: { gmailEmail: email }, // helps your webhook map back to Gmail flows
      });
      customerId = c.id;
    }

    // Build success/cancel URLs
    const successUrl =
      `${origin}/thank-you?` +
      `redirect=${encodeURIComponent("/emailresponder")}` +
      `&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl  = `${origin}/emailresponder?checkout=cancelled`;

    // Create subscription checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,

      // track this as a Gmail-initiated flow
      client_reference_id: `gmail:${email}`,
      metadata: { gmailEmail: email },
    });

    if (!session.url) {
      console.error("Stripe session created without URL", session.id);
      return NextResponse.json(
        { error: "Checkout session unavailable" },
        { status: 500 }
      );
    }

    // 303 = "See Other" (explicit redirect after a non-GET action is also safe here)
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("create-checkout-session-gmail error:", err);
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
