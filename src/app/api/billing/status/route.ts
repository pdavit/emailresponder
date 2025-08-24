// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extend the Stripe type just for current_period_end (recent type defs omit it)
type SubWithPeriod = Stripe.Subscription & { current_period_end?: number };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // 1) Find (first) customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ active: false, reason: "no_customer" });
    }
    const customerId = customers.data[0].id;

    // 2) List subs and pick an active/trialing one
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const current = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    ) as SubWithPeriod | undefined;

    const payload = {
      active: Boolean(current),
      status: current?.status ?? null,
      currentPeriodEnd: current?.current_period_end ?? null,
      priceId: current?.items?.data?.[0]?.price?.id ?? null,
    };

    console.log("[billing/status] ok", payload);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error(
      "[billing/status] error",
      err?.statusCode ?? err?.code ?? "",
      err?.message ?? err
    );
    // Keep the response simple for the client
    return NextResponse.json(
      { error: "stripe_connection_failed" },
      { status: 500 }
    );
  }
}
