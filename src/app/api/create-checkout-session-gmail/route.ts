import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** HMAC(email|ts) check with a 5-minute window */
function verify(email: string, ts: string, sig: string): boolean {
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false;

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${email}|${ts}`)
    .digest("hex");

  // constant-time compare (hex → bytes)
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** allow-list the “back” URL to Gmail only */
function isSafeGmailUrl(url: string) {
  return /^https:\/\/mail\.google\.com\//.test(url);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "";
    const ts = searchParams.get("ts") || "";
    const sig = searchParams.get("sig") || "";
    const back = searchParams.get("back") || ""; // optional Gmail link

    if (!email || !ts || !sig || !verify(email, ts, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Required env
    const required = [
      "STRIPE_SECRET_KEY",
      "STRIPE_PRICE_ID",
      "ER_SHARED_SECRET",
      "APP_ORIGIN",
    ] as const;
    const missing = required.filter(
      (k) => !process.env[k] || String(process.env[k]).trim() === ""
    );
    if (missing.length) {
      return NextResponse.json(
        { error: "Server not configured", missing },
        { status: 500 }
      );
    }

    const sk = process.env.STRIPE_SECRET_KEY!.trim();
    const priceId = process.env.STRIPE_PRICE_ID!.trim();
    const origin = process.env.APP_ORIGIN!.trim();
    const stripe = new Stripe(sk);

    // Build success/cancel URLs that optionally include the Gmail “back” link.
    const success = new URL("/api/stripe/success", origin);
    const cancel = new URL("/api/stripe/canceled", origin);
    if (back && isSafeGmailUrl(back)) {
      success.searchParams.set("back", back);
      cancel.searchParams.set("back", back);
    }

    // Reuse or create customer
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const c = await stripe.customers.create({
        email,
        metadata: { gmailEmail: email },
      });
      customerId = c.id;
    }

    // Optional: force a 7-day trial if your Price doesn’t define one
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? "0");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: success.toString(),
      cancel_url: cancel.toString(),
      client_reference_id: `gmail:${email}`,
      metadata: { gmailEmail: email },
      ...(trialDays > 0
        ? { subscription_data: { trial_period_days: trialDays } }
        : {}),
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
