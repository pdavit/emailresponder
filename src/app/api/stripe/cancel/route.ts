import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

type Body =
  | { email: string }         // your current client uses email
  | { firebaseUid: string };  // optional, if you pass uid instead

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;

    // Prefer firebaseUid if you send it. Fall back to email.
    let customerId: string | null = null;

    if (body.firebaseUid) {
      // If you store firebaseUid in customer.metadata (recommended),
      // list by customer and match in code (Stripe doesn't search metadata).
      const list = await stripe.customers.list({ limit: 50 });
      const match = list.data.find(
        (c: any) => c?.metadata?.firebaseUid === body.firebaseUid
      );
      customerId = match?.id ?? null;
    } else if (body.email) {
      const list = await stripe.customers.list({ email: body.email, limit: 1 });
      customerId = list.data[0]?.id ?? null;
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Find an active or trialing subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const sub =
      subs.data.find(s => s.status === "active" || s.status === "trialing") ??
      subs.data.find(s => s.status === "past_due" || s.status === "unpaid");

    if (!sub) {
      return NextResponse.json({ error: "No cancellable subscription" }, { status: 404 });
    }

    // Cancel immediately (no future renewal, no automatic refund)
    // Newer Stripe API recommends simply calling cancel without params.
    // If you're on an older pinned API and want to be explicit:
    // await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
    const canceled = await stripe.subscriptions.cancel(sub.id);

    return NextResponse.json({
      ok: true,
      subscriptionId: canceled.id,
      status: canceled.status,                 // "canceled"
      canceledAt: canceled.canceled_at ?? null // epoch seconds
    });
  } catch (err: any) {
    console.error("Cancel now failed:", err?.message || err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
