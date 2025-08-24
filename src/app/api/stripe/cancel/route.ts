import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({} as any));
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // 1) Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ ok: true, state: "no_customer" });
    }
    const customerId = customers.data[0].id;

    // 2) Find an active/trialing subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    const current =
      subs.data.find(s => s.status === "active" || s.status === "trialing") ?? null;

    if (!current) {
      // Nothing to cancel
      return NextResponse.json({ ok: true, state: "no_active_subscription" });
    }

    // 3) Set cancel at period end (soft cancel)
    const updated = await stripe.subscriptions.update(current.id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      ok: true,
      state: "scheduled_for_cancellation",
      subscriptionId: updated.id,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd:
        typeof (updated as any).current_period_end === "number"
          ? (updated as any).current_period_end
          : null,
    });
  } catch (err: any) {
    console.error("[stripe/cancel] error:", err);
    return NextResponse.json(
      { error: "stripe_cancel_failed", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
