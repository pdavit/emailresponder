// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------ helpers ------------------------------ */

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function verifyHmac(email: string, ts: string, sig: string, secret: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${email}|${ts}`).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// TS-safe because Stripe’s types for period end vary across versions
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

async function findCustomersByEmail(stripe: Stripe, email: string): Promise<Stripe.Customer[]> {
  const map: Record<string, Stripe.Customer> = {};

  // 1) quick path
  const list = await stripe.customers.list({ email, limit: 100 });
  for (const c of list.data) map[c.id] = c;

  // 2) robust path (may not be enabled on all accounts)
  try {
    const query = `email:'${email}' OR metadata['gmailEmail']:'${email}'`;
    const found = await stripe.customers.search({ query, limit: 100 });
    for (const c of found.data) map[c.id] = c;
  } catch {
    /* ignore if search disabled */
  }

  return Object.values(map);
}

/* -------------------------------- routes -------------------------------- */

export async function GET() {
  // simple health check
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
  const keyMode = stripeKey.startsWith("sk_live_") ? "live" : (stripeKey.startsWith("sk_test_") ? "test" : "unknown");

  const customers = await findCustomersByEmail(stripe, email);

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
        cancel_at_period_end: !!(s as any).cancel_at_period_end,
        customerId: cust.id,
      });
    }
  }

  // Consider these as “active enough” for Gmail usage
  const ACTIVE = new Set<Stripe.Subscription.Status | string>(["trialing", "active", "past_due"]);
  const active = statuses.some((s) => ACTIVE.has(s.status));

  // Helpful debug information — safe to keep while we test.
  return NextResponse.json({
    active,
    email,
    mode: keyMode,                  // <-- "live" or "test"
    customerCount: customers.length,
    statuses,                       // list of subs we saw
  }, { headers: { "cache-control": "no-store" } });
}
