import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body: any = await req.json().catch(() => ({}));
  const email = (body.email || "").toString().trim();
  const immediate = !!body.immediate;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Find the customer by email
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Find any subscription
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  if (immediate) {
    await stripe.subscriptions.cancel(sub.id);
    return NextResponse.json({ immediate: true });
  } else {
    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    const end = (updated as any)?.current_period_end ?? null;
    return NextResponse.json({ immediate: false, currentPeriodEnd: end });
  }
}
