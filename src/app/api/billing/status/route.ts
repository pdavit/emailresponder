// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // Stripe SDK requires Node runtime

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(STRIPE_KEY);

// Handle both camelCase and snake_case from differing Stripe type versions
function getPeriodEnd(sub: any): number | null {
  return sub?.currentPeriodEnd ?? sub?.current_period_end ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const { data: customers } = await stripe.customers.list({ email, limit: 1 });
    if (customers.length === 0) {
      return NextResponse.json({ active: false, reason: "no_customer" });
    }

    const customerId = customers[0].id;
    const { data: subs } = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const current =
      subs.find((s) => s.status === "active" || s.status === "trialing") ?? null;

    return NextResponse.json({
      active: !!current,
      status: current?.status ?? null,
      currentPeriodEnd: getPeriodEnd(current),
      priceId: current?.items?.data?.[0]?.price?.id ?? null,
    });
  } catch (err: any) {
    console.error("billing/status error:", err);
    return NextResponse.json(
      { error: "internal_error", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
