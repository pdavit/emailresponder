// app/api/create-checkout-session-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------- helpers -------------------- */

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/** Timing-safe HMAC(email|ts) check (±10 min skew). */
function verifyHmac(email: string, ts: string, sigHex: string, secret: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > 600) return false;

  const expectedHex = crypto.createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest("hex");

  try {
    const a = Buffer.from(expectedHex, "hex");
    const b = Buffer.from(sigHex, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Allow-list Gmail “back” URL. */
function isSafeGmailUrl(url: string) {
  try {
    return new URL(url).origin === "https://mail.google.com";
  } catch {
    return false;
  }
}

async function findCustomerByEmail(stripe: Stripe, email: string) {
  // 1) Fast list
  const listed = await stripe.customers.list({ email, limit: 5 });
  if (listed.data.length) return listed.data[0];

  // 2) Robust search (if enabled)
  try {
    const q = `email:'${email}' OR metadata['gmailEmail']:'${email}'`;
    const search = await stripe.customers.search({ query: q, limit: 5 });
    if (search.data.length) return search.data[0];
  } catch { /* ignore */ }

  return null;
}

/** Treat trialing/active/past_due as “usable”. */
async function hasUsableSubscription(stripe: Stripe, customerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const ACTIVE = new Set<Stripe.Subscription.Status>([
    "trialing",
    "active",
    "past_due",
  ]);

  return subs.data.some(s => ACTIVE.has(s.status));
}

/* -------------------- route -------------------- */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qp = url.searchParams;

    const email = (qp.get("email") || "").trim().toLowerCase();
    const ts    = (qp.get("ts")    || "").trim();
    const sig   = (qp.get("sig")   || "").trim();
    const back  = (qp.get("back")  || "").trim();

    const shared = (process.env.ER_SHARED_SECRET || "").trim();
    if (!email || !ts || !sig || !shared || !verifyHmac(email, ts, sig, shared)) {
      return jsonError("Unauthorized", 401);
    }

    // Env
    const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
    const priceId   = (process.env.STRIPE_PRICE_ID   || "").trim();
    const origin    =
      (process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "").trim()
      || `${url.protocol}//${url.host}`;

    if (!stripeKey || !priceId) {
      return jsonError("Server not configured: STRIPE_SECRET_KEY, STRIPE_PRICE_ID", 500);
    }

    const stripe = new Stripe(stripeKey);

    // Build success/cancel URLs (propagate Gmail thread + account)
    const success = new URL("/api/stripe/success", origin);
    const cancel  = new URL("/api/stripe/cancel",  origin); // ← **/cancel** (not “canceled”)

    if (back && isSafeGmailUrl(back)) {
      success.searchParams.set("back", back);
      cancel.searchParams.set("back", back);
    }
    // carry the Gmail account so success/cancel can enforce authuser
    success.searchParams.set("u", email);
    cancel.searchParams.set("u", email);

    // Reuse or create customer
    let customer = await findCustomerByEmail(stripe, email);
    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { gmailEmail: email },
      });
    }

    // If already usable, don't create a new Checkout — just bounce to success
    if (await hasUsableSubscription(stripe, customer.id)) {
      success.searchParams.set("already", "1");
      return NextResponse.redirect(success.toString(), { status: 303 });
    }

    // Optional code-driven trial (no trial on the Price itself required)
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

    // Idempotency per click (use ts from Apps Script so repeats make a new session)
    const idempotencyKey = `gmail:${email}:${priceId}:${ts}`;

    const session = await stripe.checkout.sessions.create(params, { idempotencyKey });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
