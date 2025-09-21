import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** ---------- utils ---------- */

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/** HMAC(email|ts) with 5-minute window */
function verify(email: string, ts: string, sig: string): boolean {
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;

  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false;

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expectedHex = crypto.createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest("hex");

  try {
    const a = Buffer.from(expectedHex, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** allow-list Gmail “back” URL */
function isSafeGmailUrl(url: string) {
  return /^https:\/\/mail\.google\.com\//.test(url);
}

/** Try hard to find a customer by email or metadata.gmailEmail */
async function findCustomerByEmail(stripe: Stripe, email: string) {
  // 1) Quick list
  const list = await stripe.customers.list({ email, limit: 3 });
  if (list.data.length) return list.data[0];

  // 2) Search (some accounts may not have this enabled)
  try {
    const query = `email:'${email}' OR metadata['gmailEmail']:'${email}'`;
    const search = await stripe.customers.search({ query, limit: 3 });
    if (search.data.length) return search.data[0];
  } catch {
    /* ignore */
  }
  return null;
}

/** Return true if customer already has a usable subscription */
async function hasUsableSubscription(stripe: Stripe, customerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const ACTIVE = new Set<Stripe.Subscription.Status>([
    "trialing",
    "active",
    // include past_due if you consider it “active enough”
  ]);

  return subs.data.some((s) => ACTIVE.has(s.status));
}

/** ---------- route ---------- */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const ts    = (searchParams.get("ts") || "").trim();
    const sig   = (searchParams.get("sig") || "").trim();
    const back  = (searchParams.get("back") || "").trim();

    if (!email || !ts || !sig || !verify(email, ts, sig)) {
      return bad("Unauthorized", 401);
    }

    // Required env
    const required = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "APP_ORIGIN"] as const;
    const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
    if (missing.length) return bad(`Server not configured: ${missing.join(", ")}`, 500);

    const sk      = process.env.STRIPE_SECRET_KEY!.trim();
    const priceId = process.env.STRIPE_PRICE_ID!.trim();
    const origin  = process.env.APP_ORIGIN!.trim();
    const stripe  = new Stripe(sk);

    // Build success/cancel (propagate Gmail "back" if safe)
    const success = new URL("/api/stripe/success", origin);
    const cancel  = new URL("/api/stripe/canceled", origin);
    if (back && isSafeGmailUrl(back)) {
      success.searchParams.set("back", back);
      cancel.searchParams.set("back", back);
    }

    // Reuse or create customer
    let customer = await findCustomerByEmail(stripe, email);
    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { gmailEmail: email },
      });
    }

    // Guard: if already trialing/active, don't create another subscription
    if (await hasUsableSubscription(stripe, customer.id)) {
      // Optional: mark that we short-circuited
      success.searchParams.set("already", "1");
      return NextResponse.redirect(success.toString(), { status: 303 });
    }

    // Code-driven trial (no trial needed on the Price)
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? "7");
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      trialDays > 0
        ? {
            trial_period_days: trialDays,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          }
        : {};

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: success.toString(),
      cancel_url: cancel.toString(),
      client_reference_id: `gmail:${email}`,
      metadata: { gmailEmail: email },
      subscription_data: subscriptionData,
    };

    // Idempotency: prevents repeated clicks from creating multiple sessions
    const idempotencyKey = `gmail:${email}:${priceId}`;

    const session = await stripe.checkout.sessions.create(params, { idempotencyKey });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
