// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

// Optional: make trial days configurable; falls back to 7
const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? "7");

function getBaseUrl(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Ensure we reuse a single Stripe customer per app user.
 * 1) Try customers.search by metadata.firebaseUid (best).
 * 2) Fallback to customers.list by email.
 * 3) If none found, create one (with metadata.firebaseUid).
 * Also backfill metadata/email on found customers for future webhooks.
 */
async function getOrCreateCustomer(opts: { userId: string; email: string }) {
  const { userId, email } = opts;

  // Try search by metadata (requires Stripe Search)
  try {
    const found = await stripe.customers.search({
      query: `metadata['firebaseUid']:'${userId.replace(/'/g, "\\'")}'`,
      limit: 1,
    });
    if (found.data[0]) {
      // Keep email in sync if missing
      if (!found.data[0].email && email) {
        await stripe.customers.update(found.data[0].id, { email });
      }
      return found.data[0];
    }
  } catch {
    /* fall through */
  }

  // Fallback: list by email
  const byEmail = await stripe.customers.list({ email, limit: 1 });
  if (byEmail.data[0]) {
    // Backfill UID metadata to make webhooks reliable going forward
    if (byEmail.data[0].metadata?.firebaseUid !== userId) {
      await stripe.customers.update(byEmail.data[0].id, {
        metadata: { ...byEmail.data[0].metadata, firebaseUid: userId },
      });
    }
    return byEmail.data[0];
  }

  // Create if still not found
  return await stripe.customers.create({
    email,
    metadata: { firebaseUid: userId },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "");
    const email = String(body?.email || "");
    const redirect = String(body?.redirect || "/emailresponder");
    const price = process.env.STRIPE_PRICE_ID;

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email." }, { status: 400 });
    }
    if (!price) {
      return NextResponse.json({ error: "Missing STRIPE_PRICE_ID env." }, { status: 500 });
    }

    const baseUrl = getBaseUrl(req);

    // Reuse or create a single Customer
    const customer = await getOrCreateCustomer({ userId, email });

    // Create Checkout Session with a per-subscription trial
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: userId,
      line_items: [{ price, quantity: 1 }],

      // ✅ Modern way: per-subscription trial (Price "trial days" is legacy/incompatible with Checkout)
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { firebaseUid: userId }, // stamp on subscription for webhook certainty
      },

      // Keep session-level metadata too (handy for logs)
      metadata: { firebaseUid: userId },

      allow_promotion_codes: true,
      success_url: `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(
        redirect
      )}`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,

      // Optional niceties:
      billing_address_collection: "auto",
      // automatic_tax: { enabled: true },
      // tax_id_collection: { enabled: true },
      // If you ever want “no card up front”, add:
      // payment_method_collection: "if_required",
      // subscription_data: { ... trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] error", err);
    return NextResponse.json(
      { error: err?.message ?? "stripe_connection_failed" },
      { status: 500 }
    );
  }
}

