import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "missing_email" }, { status: 400 });
    }

    // Sanity check so we can see config issues in logs without leaking secrets
    const key = process.env.STRIPE_SECRET_KEY ?? "";
    if (!key || !key.startsWith("sk_")) {
      console.error(
        `[billing/status] invalid STRIPE_SECRET_KEY (${key.slice(0, 3)}…${key.slice(-6)})`
      );
      return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
    }

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      console.log("[billing/status] no_customer", { email });
      return NextResponse.json({ active: false, reason: "no_customer" });
    }

    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    const current =
      subs.data.find((s) => s.status === "active" || s.status === "trialing") ?? null;

    const payload = {
      active: !!current,
      status: current?.status ?? null,
      currentPeriodEnd: current?.current_period_end ?? null,
      priceId: current?.items.data[0]?.price?.id ?? null,
    };

    console.log("[billing/status] ok", {
      customerId,
      active: payload.active,
      status: payload.status,
      priceId: payload.priceId,
      cpe: payload.currentPeriodEnd,
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    // Rich server logs so we can see exactly what's happening on Vercel
    console.error("[billing/status] Stripe error", {
      name: err?.name,
      type: err?.type,          // AuthenticationError, APIConnectionError, etc.
      code: err?.code,
      statusCode: err?.statusCode,
      message: err?.message,
      requestId: err?.requestId,
      stack: err?.stack,
    });
    return NextResponse.json({ error: "stripe_connection_error" }, { status: 500 });
  }
}
