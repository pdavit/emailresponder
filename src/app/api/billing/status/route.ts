// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeStripeError(err: unknown) {
  if (err instanceof Stripe.errors.StripeError) {
    return {
      type: err.type,
      code: err.code ?? null,
      statusCode: err.statusCode ?? null,
      requestId: err.requestId ?? null,
      message: err.message,
    };
  }
  try {
    return { message: (err as any)?.message ?? String(err) };
  } catch {
    return { message: "Unknown error" };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    // Look up customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json({ active: false, reason: "no_customer" });
    }

    // Find most-recent subscription
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });

    const current = subs.data.find(s =>
      ["active", "trialing", "past_due", "unpaid"].includes(s.status)
    );

   // normalize current_period_end (Stripe returns a number at runtime)
const currentPeriodEnd =
  typeof (current as any)?.current_period_end === "number"
    ? (current as any).current_period_end
    : null;

    const priceId = current?.items?.data?.[0]?.price?.id ?? null;

    return NextResponse.json({
      active: !!current && (current.status === "active" || current.status === "trialing"),
      status: current?.status ?? null,
      currentPeriodEnd,
      priceId,
    });
  } catch (err) {
    const details = serializeStripeError(err);
    console.error("[billing/status] stripe error", details);
    return NextResponse.json(
      { error: "stripe_connection_failed", details },
      { status: 500 }
    );
  }
}
