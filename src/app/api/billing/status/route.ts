// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe"; // your shared client

export const runtime = "nodejs";        // ensure Node runtime (Stripe SDK needs Node)
export const dynamic = "force-dynamic"; // avoid caching

function mask(v?: string | null) {
  if (!v) return "undefined";
  return v.slice(0, 7) + "…" + v.slice(-4);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  // Quick sanity logs will show up in Vercel -> Logs
  console.log(
    "[billing/status] start",
    JSON.stringify({
      region: process.env.VERCEL_REGION,
      hasKey: !!process.env.STRIPE_SECRET_KEY,
      keyPreview: mask(process.env.STRIPE_SECRET_KEY || null),
    })
  );

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[billing/status] missing STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "missing_stripe_key" }, { status: 500 });
  }

  try {
    // 1) Find (or not) a customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      console.log("[billing/status] no_customer");
      return NextResponse.json({ active: false, reason: "no_customer" });
    }

    const customerId = customers.data[0].id;

    // 2) Find current subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });
    const current = subs.data.find((s) => s.status === "active" || s.status === "trialing");

    const payload = {
      active: !!current,
      status: current?.status ?? null,
      currentPeriodEnd: current?.current_period_end ?? null,
      priceId: current?.items.data[0]?.price?.id ?? null,
    };
    console.log("[billing/status] ok", payload);

    return NextResponse.json(payload);
  } catch (err: any) {
    // Log everything Stripe gives us
    console.error("[billing/status] stripe error", {
      type: err?.type,
      code: err?.code,
      statusCode: err?.statusCode,
      message: err?.message,
      stack: err?.stack,
    });
    // Return a small, client-safe error
    return NextResponse.json({ error: err?.message || "internal_error" }, { status: 500 });
  }
}
