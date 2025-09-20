// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------ Small helpers ------------------------------ */

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function verifyHmac(email: string, ts: string, sig: string, secret: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false; // 5 minutes

  const expected = crypto.createHmac("sha256", secret).update(`${email}|${ts}`).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// TS-safe normalization for period end (Stripe typings differ by version)
function getPeriodEnd(sub: Stripe.Subscription): number | null {
  const s: any = sub as any;
  const v =
    s.current_period_end ??
    s.currentPeriodEnd ??
    s.trial_end ??
    s.trialEnd ??
    null;

  if (!v) return null;
  return typeof v === "number" ? v : Math.floor(new Date(v).getTime() / 1000);
}

// Gather (unique) customers for an email via list + (optional) search
async function findCustomersByEmail(stripe: Stripe, email: string): Promise<Stripe.Customer[]> {
  const out: Record<string, Stripe.Customer> = {};

  const listed = await stripe.customers.list({ email, limit: 100 });
  for (const c of listed.data) out[c.id] = c;

  // Search may not be enabled in all accounts; ignore failures
  try {
    const query = `email:'${email}' OR metadata['gmailEmail']:'${email}'`;
    const found = await stripe.customers.search({ query, limit: 100 });
    for (const c of found.data) out[c.id] = c;
  } catch { /* noop */ }

  return Object.values(out);
}

/* -------------------------------- Handlers -------------------------------- */

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const secret = (process.env.ER_SHARED_SECRET || "").trim();
  if (!stripeKey || !secret) return jsonError("Server not configured", 500);

  let body: { email?: string; ts?: string; sig?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const email = (body.email || "").toString().trim().toLowerCase();
  const ts = (body.ts || "").toString();
  const sig = (body.sig || "").toString();

  if (!email || !ts || !sig) return jsonError("Missing fields");
  if (!verifyHmac(email, ts, sig, secret)) return jsonError("Bad signature", 401);

  const stripe = new Stripe(stripeKey);

  // find ALL customers matching this email/metadata
  const customers = await findCustomersByEmail(stripe, email);
  if (!customers.length) {
    return NextResponse.json({ active: false, reason: "no_customer", statuses: [] });
  }

  // Collect subscriptions across all matching customers
  const statuses: Array<{
    id: string;
    status: Stripe.Subscription.Status | string;
    current_period_end: number | null;
    cancel_at_period_end: boolean;
    customerId: string;
  }> = [];

  for (const cust of customers) {
    const subs = await stripe.subscriptions.list({
      customer: cust.id,
      status: "all",
      limit: 100,
    });

    for (const s of subs.data) {
      statuses.push({
        id: s.id,
        status: s.status,
        current_period_end: getPeriodEnd(s),
        // Some Stripe TS versions hide this field; coerce to boolean safely
        cancel_at_period_end: !!(s as any).cancel_at_period_end,
        customerId: cust.id,
      });
    }
  }

  // treat these as "active enough" for Gmail usage
  const ACTIVE = new Set<Stripe.Subscription.Status | string>([
    "trialing",
    "active",
    // include past_due so users aren't blocked if a payment is retrying
    "past_due",
  ]);

  const hasActive = statuses.some((s) => ACTIVE.has(s.status));

  return NextResponse.json({
    active: hasActive,
    statuses, // keep while debugging; remove later if you want
  });
}
