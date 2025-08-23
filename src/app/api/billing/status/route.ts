import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Find Stripe customer by email (MVP; fine if one customer per email)
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (!customers.data.length) {
    return NextResponse.json({ active: false, reason: "no_customer" });
  }

  const customerId = customers.data[0].id;
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 5 });

  // Treat only active/trialing as “has access”
  const current = subs.data.find(s => s.status === "active" || s.status === "trialing");
  const active = Boolean(current);

  return NextResponse.json({
    active,
    status: current?.status ?? null,
    currentPeriodEnd: current?.current_period_end ?? null,
    priceId: current?.items.data[0]?.price?.id ?? null,
  });
}
