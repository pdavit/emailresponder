import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // 1) Find (or not) a customer for this email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ active: false, reason: "no_customer" });
    }
    const customerId = customers.data[0].id;

    // 2) Look up subscriptions for the customer
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    const current = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    // 3) Build response (soft-type current_period_end to satisfy TS)
    const currentPeriodEnd =
      current && (current as any).current_period_end
        ? Number((current as any).current_period_end)
        : null;

    const priceId = current?.items?.data?.[0]?.price?.id ?? null;

    return NextResponse.json({
      active: !!current,
      status: current?.status ?? null,
      currentPeriodEnd,
      priceId,
    });
  } catch (err: any) {
    console.error("[billing/status] error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message || "stripe_error" },
      { status: 500 }
    );
  }
}
