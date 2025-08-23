// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Use the default Node runtime, *not* edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 500) {
  // keep errors visible in Vercel function logs
  console.error("[billing/status] error:", message);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return jsonError("Missing STRIPE_SECRET_KEY env", 500);

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return jsonError("email required", 400);

    const stripe = new Stripe(secret); // no apiVersion override

    // 1) Look up customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({
        active: false,
        status: null,
        currentPeriodEnd: null,
        priceId: null,
        reason: "no_customer",
      });
    }

    const customerId = customers.data[0].id;

    // 2) Get subscriptions for that customer
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // active/trialing wins
    const current = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing",
    );

    // Stripe types: current_period_end is present in the API response, but the
    // type is a bit stricter. Cast to any when reading it.
    const currentPeriodEnd =
      (current as any)?.current_period_end ?? null;

    return NextResponse.json({
      active: !!current,
      status: current?.status ?? null,
      currentPeriodEnd,
      priceId: current?.items.data[0]?.price?.id ?? null,
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "internal_error", 500);
  }
}
