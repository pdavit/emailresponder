// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// HMAC verify: email|ts signed with ER_SHARED_SECRET
function verify(email: string, ts: string, sig: string): boolean {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false;

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${email}|${ts}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && crypto.timingSafeEqual(expected, given);
}

export async function POST(req: NextRequest) {
  try {
    const { email, ts, sig } = await req.json().catch(() => ({}));
    const normEmail = String(email || "").trim().toLowerCase();

    if (!normEmail || !ts || !sig || !verify(normEmail, ts, sig)) {
      return NextResponse.json({ active: false, reason: "unauthorized" }, { status: 401 });
    }

    const sk = (process.env.STRIPE_SECRET_KEY ?? "").trim();
    if (!sk) {
      console.error("Missing STRIPE_SECRET_KEY");
      return NextResponse.json({ active: false, reason: "server_misconfigured" }, { status: 500 });
    }

    const stripe = new Stripe(sk);

    // Find all customers by email (there can be >1 over time)
    const customers = await stripe.customers.list({ email: normEmail, limit: 100 });
    console.log("[status] email", normEmail, "customers", customers.data.map(c => c.id));

    let isActive = false;
    let detail: any = [];

    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 100 });
      const statuses = subs.data.map(s => s.status);
      detail.push({ customer: c.id, statuses });

      if (subs.data.some(s => s.status === "trialing" || s.status === "active")) {
        isActive = true;
        break;
      }
    }

    console.log("[status] result", { email: normEmail, isActive, detail });
    return NextResponse.json({ active: isActive });
  } catch (err: any) {
    console.error("subscription-status-gmail error:", err?.message || err);
    return NextResponse.json({ active: false, reason: "error" }, { status: 500 });
  }
}
