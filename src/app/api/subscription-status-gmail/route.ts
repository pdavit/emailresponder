import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function verifyHmac(email: string, ts: string, sig: string, secret: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false; // 5 min

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

async function findCustomerByEmail(stripe: Stripe, email: string) {
  // 1) quick list by email
  const list = await stripe.customers.list({ email, limit: 3 });
  if (list.data.length) return list.data[0];

  // 2) robust search (also checks metadata.gmailEmail)
  try {
    const qry = `email:'${email}' OR metadata['gmailEmail']:'${email}'`;
    const search = await stripe.customers.search({ query: qry, limit: 3 });
    if (search.data.length) return search.data[0];
  } catch { /* not all accounts have search enabled */ }

  return null;
}

export async function POST(req: NextRequest) {
  const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const secret    = (process.env.ER_SHARED_SECRET || "").trim();
  if (!stripeKey || !secret) return bad("Server not configured", 500);

  let body: { email?: string; ts?: string; sig?: string } = {};
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const emailRaw = (body.email || "").toString().trim();
  const email = emailRaw.toLowerCase();
  const ts  = (body.ts || "").toString();
  const sig = (body.sig || "").toString();

  if (!email || !ts || !sig) return bad("Missing fields");
  if (!verifyHmac(email, ts, sig, secret)) return bad("Bad signature", 401);

  const stripe = new Stripe(stripeKey);

  // Find the customer
  const customer = await findCustomerByEmail(stripe, email);
  if (!customer) {
    return NextResponse.json({ active: false, reason: "no_customer" });
  }

  // Check subscriptions
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 10,
    expand: ["data.latest_invoice.payment_intent"]
  });

  const useful = subs.data.map(s => ({
    id: s.id,
    status: s.status,
    current_period_end: s.current_period_end,
    cancel_at_period_end: (s as any).cancel_at_period_end ?? false,
  }));

  // treat trialing, active, and (optionally) past_due as “active enough”
  const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status | string>([
    "trialing",
    "active",
    "past_due",
  ]);

  const hasActive = useful.some(s => ACTIVE_STATUSES.has(s.status));

  return NextResponse.json({
    active: hasActive,
    statuses: useful, // handy for troubleshooting; remove later if you want
  });
}
