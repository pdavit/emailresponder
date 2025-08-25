// src/app/api/stripe/cancel/route.ts
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CancelBody = {
  email?: string;
  firebaseUid?: string; // preferred lookup
};

async function findCustomerId({
  email,
  firebaseUid,
}: CancelBody): Promise<string | null> {
  // Prefer searching by metadata(firebaseUid)
  if (firebaseUid) {
    try {
      // If Customers Search is enabled on your account:
      // Docs: https://stripe.com/docs/search#search-query-language
      const search = await (stripe.customers as any).search?.({
        query: `metadata['firebaseUid']:'${firebaseUid}'`,
        limit: 1,
      });
      if (search && search.data?.[0]?.id) return search.data[0].id;
    } catch {
      // fall through to manual list fallback below
    }

    // Fallback: list a page and filter by metadata in code
    const page = await stripe.customers.list({ limit: 100 });
    const hit = page.data.find(
      (c: any) => c?.metadata?.firebaseUid === firebaseUid
    );
    if (hit?.id) return hit.id;
  }

  // Fallback: lookup by email (can return multiple in general)
  if (email) {
    const byEmail = await stripe.customers.list({ email, limit: 1 });
    if (byEmail.data[0]?.id) return byEmail.data[0].id;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    // Parse body safely and type it
    const { email, firebaseUid } = (await req.json().catch(() => ({}))) as CancelBody;

    if (!email && !firebaseUid) {
      return NextResponse.json(
        { error: "Provide either firebaseUid or email." },
        { status: 400 }
      );
    }

    const customerId = await findCustomerId({ email, firebaseUid });
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    // Get active subscriptions
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100,
    });

    if (subs.data.length === 0) {
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 404 }
      );
    }

    // Cancel immediately. Stripe does NOT auto-refund on cancel.
    // (No need to set proration options; refunds are a separate, explicit API.)
    const canceledIds: string[] = [];
    for (const s of subs.data) {
      const canceled = await stripe.subscriptions.cancel(s.id);
      canceledIds.push(canceled.id);
    }

    return NextResponse.json({
      ok: true,
      canceled: canceledIds,
      note: "Canceled immediately. No refund is issued automatically.",
    });
  } catch (err) {
    console.error("Cancel route error:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription." },
      { status: 500 }
    );
  }
}
