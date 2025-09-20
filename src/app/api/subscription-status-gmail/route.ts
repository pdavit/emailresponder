// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- HMAC verify: hex(HMAC_SHA256(email|ts, ER_SHARED_SECRET)) ---------- */
function verify(email: string, ts: string, sig: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;

  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false; // ±5 min window

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest("hex");

  // compare as bytes, equal-length
  let a: Buffer, b: Buffer;
  try {
    a = Buffer.from(expected, "hex");
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

function isActiveStatus(s: Stripe.Subscription.Status | string) {
  return s === "active" || s === "trialing";
}

function getPeriodEnd(sub?: Stripe.Subscription | null): number | null {
  if (!sub) return null;
  const v =
    (sub as any).current_period_end ??
    (sub as any).currentPeriodEnd ??
    (sub as any).trial_end ??
    (sub as any).trialEnd ??
    null;
  return typeof v === "number" ? v : v ? Math.floor(new Date(v).getTime() / 1000) : null;
}

type Found = { sub: Stripe.Subscription | null; customerId: string | null };

/** Look across all Stripe customers with this email and pick the best/most-recent sub. */
async function findSubscriptionByEmail(stripe: Stripe, email: string): Promise<Found> {
  // Stripe can hold duplicates; scan them all.
  const customers = await stripe.customers.list({ email, limit: 100 });
  let bestActive: { sub: Stripe.Subscription; customerId: string } | null = null;
  let newestAny: { sub: Stripe.Subscription; customerId: string } | null = null;

  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 100,
    });

    for (const s of subs.data) {
      // prefer any active/trialing with the farthest current_period_end
      if (isActiveStatus(s.status)) {
        if (
          !bestActive ||
          (getPeriodEnd(s) ?? 0) > (getPeriodEnd(bestActive.sub) ?? 0)
        ) {
          bestActive = { sub: s, customerId: c.id };
        }
      }
      // track newest sub of any status as a fallback
      if (!newestAny || (s.created ?? 0) > (newestAny.sub.created ?? 0)) {
        newestAny = { sub: s, customerId: c.id };
      }
    }
  }

  if (bestActive) return bestActive;
  if (newestAny) return newestAny;
  return { sub: null, customerId: customers.data[0]?.id ?? null };
}

/* --------------------------------- POST ------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const sk = (process.env.STRIPE_SECRET_KEY ?? "").trim();
    const er = (process.env.ER_SHARED_SECRET ?? "").trim();
    if (!sk || !er) {
      return NextResponse.json(
        { error: "Server not configured", missing: ["STRIPE_SECRET_KEY", "ER_SHARED_SECRET"] },
        { status: 500 }
      );
    }

    const { email: rawEmail, ts, sig } = (await req.json()) ?? {};
    const email = String(rawEmail ?? "").trim().toLowerCase();

    if (!email || !ts || !sig || !verify(email, String(ts), String(sig))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = new Stripe(sk);
    const { sub, customerId } = await findSubscriptionByEmail(stripe, email);

    const status = sub?.status ?? null;
    const active = !!sub && isActiveStatus(sub.status);
    const currentPeriodEnd = getPeriodEnd(sub);

    return NextResponse.json({
      active,
      status,
      currentPeriodEnd,
      subscriptionId: sub?.id ?? null,
      customerId: customerId ?? null,
    });
  } catch (err: any) {
    console.error("subscription-status-gmail error:", err);
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/* Optional: simple health probe */
export async function GET() {
  return NextResponse.json({ ok: true });
}
