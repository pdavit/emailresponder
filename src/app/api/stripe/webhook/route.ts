// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe"; // types only
import stripe from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";        // Stripe SDK needs Node
export const dynamic = "force-dynamic"; // do not cache
export const revalidate = 0;
// export const maxDuration = 10; // (optional) cap execution time on Vercel

// --- Health check ---
export async function GET() {
  return NextResponse.json({ ok: true });
}

/* ---------------------- Firestore helpers ---------------------- */

function billingDoc(uid: string) {
  return adminDb.collection("users").doc(uid);
}

// Simple idempotency guard: will be true if this event was already processed
async function isDuplicate(eventId: string): Promise<boolean> {
  const ref = adminDb.collection("_stripe_events").doc(eventId);
  try {
    await ref.create({ receivedAt: FieldValue.serverTimestamp() });
    return false; // created -> not duplicate
  } catch (e: any) {
    // Firestore ALREADY_EXISTS
    if (e?.code === 6 || /already exists/i.test(String(e?.message))) return true;
    throw e;
  }
}

async function getUidFromCustomer(customerId: string): Promise<string> {
  const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  return (customer?.metadata as any)?.firebaseUid || "";
}

async function linkCustomerToUser(opts: { firebaseUid: string; customerId: string }) {
  const { firebaseUid, customerId } = opts;

  await billingDoc(firebaseUid).set(
    {
      billing: {
        customerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  // Ensure future events always map back to this user
  try {
    await stripe.customers.update(customerId, {
      metadata: { firebaseUid },
    });
  } catch {
    /* non-fatal */
  }
}

function getPeriodEnd(sub: Stripe.Subscription | any): number | null {
  return sub?.current_period_end ?? sub?.currentPeriodEnd ?? null;
}

async function setSubscriptionStatus(opts: {
  firebaseUid: string;
  subscriptionId: string;
  priceId: string | null;
  status: Stripe.Subscription.Status | string;
  currentPeriodEnd: number | null;
}) {
  const { firebaseUid, subscriptionId, priceId, status, currentPeriodEnd } = opts;
  const active = status === "trialing" || status === "active";

  await billingDoc(firebaseUid).set(
    {
      billing: {
        subscriptionId,
        priceId,
        status,
        currentPeriodEnd,
        active,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/* --------------------------- Main handler --------------------------- */

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return new NextResponse("Misconfigured webhook", { status: 500 });
  }

  let event: Stripe.Event;

  // Stripe requires the *raw* body
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Idempotency: ignore retries if we've handled this exact event.id
  try {
    const dup = await isDuplicate(event.id);
    if (dup) return NextResponse.json({ received: true, deduped: true });
  } catch (e) {
    console.warn("⚠️ Dedupe check failed, proceeding anyway:", e);
  }

  try {
    switch (event.type) {
      /* ------------------ User completes Checkout ------------------ */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const firebaseUid =
          (session.metadata as any)?.firebaseUid ||
          (session.client_reference_id as string) ||
          "";

        const customerId = (session.customer as string) ?? "";
        if (firebaseUid && customerId) {
          await linkCustomerToUser({ firebaseUid, customerId });
        }

        const subscriptionId = (session.subscription as string) || "";
        if (firebaseUid && subscriptionId) {
          const sub = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as Stripe.Subscription;

          const priceId = sub.items?.data?.[0]?.price?.id ?? null;

          await setSubscriptionStatus({
            firebaseUid,
            subscriptionId: sub.id,
            priceId,
            status: sub.status,
            currentPeriodEnd: getPeriodEnd(sub),
          });
        }
        break;
      }

      /* ---------------- Subscription lifecycle changes -------------- */
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const firebaseUid = await getUidFromCustomer(customerId);
        if (firebaseUid) {
          const priceId = sub.items?.data?.[0]?.price?.id ?? null;
          await setSubscriptionStatus({
            firebaseUid,
            subscriptionId: sub.id,
            priceId,
            status: sub.status,
            currentPeriodEnd: getPeriodEnd(sub),
          });
        }
        break;
      }

      /* ---------------------- Payment failed ------------------------ */
     case "invoice.payment_failed": {
  // Some Stripe TS versions don't expose `subscription` on Invoice.
  type InvoiceMaybeSub = Stripe.Invoice & {
    subscription?: string | { id: string } | null;
  };

  const invoice = event.data.object as InvoiceMaybeSub;

  const customerId = (invoice.customer as string) ?? null;

  // Safely resolve the subscription id if present on the invoice
  const subId: string | null =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id ?? null;

  let sub: Stripe.Subscription | null = null;

  if (subId) {
    sub = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
  } else if (customerId) {
    // Fallback: get the most recent sub for the customer
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });
    sub = list.data[0] ?? null;
  }

  if (sub && customerId) {
    const firebaseUid = await getUidFromCustomer(customerId);
    const priceId = sub.items?.data?.[0]?.price?.id ?? null;

    if (firebaseUid) {
      await setSubscriptionStatus({
        firebaseUid,
        subscriptionId: sub.id,
        priceId,
        status: sub.status, // often "past_due"
        currentPeriodEnd: getPeriodEnd(sub),
      });
    }
  }
  break;
}

      // Optionally handle more events (trial_will_end, async_payment_*), else ignore
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
