// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import stripe from "@/lib/stripe"; // your shared Stripe client
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Constant-time HMAC verification for `${email}|${ts}` using ER_SHARED_SECRET. */
function verify(emailRaw: string, ts: string, sigHex: string): boolean {
  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const tsNum = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;

  // 5-minute window, no future timestamps
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false;

  const email = emailRaw.trim().toLowerCase();

  const expected = crypto.createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest();

  let supplied: Buffer;
  try {
    supplied = Buffer.from(sigHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== supplied.length) return false;

  try {
    return crypto.timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}

/** True if ANY customer with this email has ANY sub that is active or trialing. */
async function hasActiveOrTrialingSubForEmail(emailRaw: string): Promise<boolean> {
  const email = emailRaw.trim().toLowerCase();

  // Find up to 100 customers that match this email
  const customers = await stripe.customers.list({ email, limit: 100 });

  if (!customers.data.length) return false;

  // For each customer, scan their subscriptions (status: all)
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 100,
    });

    for (const s of subs.data) {
      if (s.status === "active" || s.status === "trialing") {
        return true;
      }
    }
  }

  return false;
}

/** Health check */
export async function GET() {
  return NextResponse.json({ ok: true });
}

/** Main endpoint: body = { email, ts, sig } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim();
    const ts    = String(body?.ts ?? "").trim();
    const sig   = String(body?.sig ?? "").trim();

    if (!email || !ts || !sig) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!verify(email, ts, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ask Stripe directly
    const active = await hasActiveOrTrialingSubForEmail(email);
    return NextResponse.json({ active });
  } catch (err) {
    console.error("subscription-status-gmail error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
