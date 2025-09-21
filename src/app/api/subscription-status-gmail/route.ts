// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function timingSafeHexEqual(aHex: string, bHex: string) {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyHmac(email: string, ts: string, sig: string, secret: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "bad_ts" };

  // generous skew for Apps Script
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > 600) return { ok: false, reason: "ts_skew" };

  const expected = crypto.createHmac("sha256", secret).update(`${email}|${ts}`).digest("hex");
  if (!timingSafeHexEqual(expected, sig)) return { ok: false, reason: "sig_mismatch" };
  return { ok: true as const, reason: "ok" };
}

async function findCustomerByEmail(stripe: Stripe, email: string) {
  // 1) Plain list by email (works everywhere)
  const list = await stripe.customers.list({ email, limit: 5 });
  if (list.data.length) return list.data[0];

  // 2) Search API (if enabled) – also check metadata.gmailEmail
  try {
    const q = `email:'${email}' OR metadata['gmailEmail']:'${email}'`;
    const search = await stripe.customers.search({ query: q, limit: 5 });
    if (search.data.length) return search.data[0];
  } catch {
    /* ignore if not enabled */
  }

  return null;
}

// NEW: fallback via recent Checkout Sessions with client_reference_id="gmail:<email>"
async function findCustomerViaCheckout(stripe: Stripe, email: string) {
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 50 }); // small scan of recent
    const hit = sessions.data.find(
      (s) =>
        s.client_reference_id === `gmail:${email}` &&
        typeof s.customer === "string"
    );
    if (hit && typeof hit.customer === "string") {
      const cust = await stripe.customers.retrieve(hit.customer);
      if (!("deleted" in cust) || !cust.deleted) return cust as Stripe.Customer;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(req: NextRequest) {
  const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const shared = (process.env.ER_SHARED_SECRET || "").trim();
  const allowIncomplete = (process.env.ER_COUNT_INCOMPLETE_AS_ACTIVE || "").trim() === "1";

  if (!stripeKey || !shared) return jsonError("Server not configured", 500);

  let body: { email?: string; ts?: string; sig?: string } = {};
  try { body = await req.json(); } catch { return jsonError("Invalid JSON"); }

  const email = String(body.email || "").trim().toLowerCase();
  const ts = String(body.ts || "");
  const sig = String(body.sig || "");
  if (!email || !ts || !sig) return jsonError("Missing fields");

  const hv = verifyHmac(email, ts, sig, shared);
  if (!hv.ok) {
    console.log("[status] bad signature", { email, reason: hv.reason });
    return jsonError("Unauthorized", 401);
  }

  const stripe = new Stripe(stripeKey);

  // Find the customer
  let customer = await findCustomerByEmail(stripe, email);
  if (!customer) {
    customer = await findCustomerViaCheckout(stripe, email);
  }

  if (!customer) {
    console.log("[status] no_customer", { email });
    return NextResponse.json({ active: false, reason: "no_customer", statuses: [] });
  }

  // Pull latest subscriptions for that customer
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 20,
  });

  const statuses = subs.data.map((s: any) => ({
    id: s.id,
    status: s.status,
    current_period_end: s.current_period_end ?? null,
    cancel_at_period_end: !!s.cancel_at_period_end,
  }));

  const ACTIVE = new Set<string>(["trialing", "active", "past_due"]);
  if (allowIncomplete) ACTIVE.add("incomplete");

  const hasActive = statuses.some((s) => ACTIVE.has(String(s.status)));

  console.log("[status] result", {
    email,
    customerId: customer.id,
    hasActive,
    statuses: statuses.map((s) => `${s.id}:${s.status}`),
  });

  return NextResponse.json({
    active: hasActive,
    reason: hasActive ? "ok" : "no_active_subscriptions",
    statuses,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
