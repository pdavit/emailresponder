// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Remove the apiVersion override:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) {
    return NextResponse.json({ active: false, reason: "no_customer" });
  }

  const customerId = customers.data[0].id;
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 5 });
  const current = subs.data.find(s => s.status === "active" || s.status === "trialing");

  return NextResponse.json({
    active: !!current,
    status: current?.status ?? null,
    currentPeriodEnd: current?.current_period_end ?? null,
    priceId: current?.items.data[0]?.price?.id ?? null,
  });
}
