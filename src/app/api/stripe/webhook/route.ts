// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";        // Stripe SDK needs Node
export const dynamic = "force-dynamic"; // no caching for webhooks

// ---- TODO: replace with real DB calls ----
async function linkCustomerToUser(_opts: { firebaseUid: string; customerId: string }) {}
async function setSubscriptionStatus(_opts: {
  firebaseUid: string;
  subscriptionId: string;
  priceId: string | null;
  status: string;
  currentPeriodEnd: number | null;
}) {}
// ------------------------------------------

// Liveness probe (Stripe sometimes pings)
export async function GET() {
  return NextResponse.json({ ok: true });
}

// Helper: normalize period end across Stripe type versions
function getPeriodEnd(sub: any): number | null {
  return sub?.current_period_end ?? sub?.currentPeriodEnd ?? null;
}

// Helper: one place to persist subscription state
async function persistFromSubscription(firebaseUid: string, sub: Stripe.Subscription) {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  await setSubscriptionStatus({
    firebaseUid,
    subscriptionId: sub.id,
    priceId,
    status: sub.status,
    currentPeriodEnd: getPeriodEnd(sub),
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return new NextResponse("Misconfigured webhook", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    // IMPORTANT: use raw body for signature verification
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Prefer metadata, fall back to client_reference_id
        const firebaseUid =
          (session.metadata as any)?.firebaseUid ||
          (session.client_reference_id as string) ||
          "";

        const customerId = (session.customer as string) ?? "";
        const subscriptionId = (session.subscription as string) ?? "";

        if (firebaseUid && customerId) {
          await linkCustomerToUser({ firebaseUid, customerId });
        }

        if (firebaseUid && subscriptionId) {
          const sub = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as Stripe.Subscription;
          await persistFromSubscription(firebaseUid, sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Retrieve customer to get stored firebaseUid
        const customer = await stripe.customers.retrieve(customerId);
        const firebaseUid = (customer as any)?.metadata?.firebaseUid || "";
        if (firebaseUid) {
          await persistFromSubscription(firebaseUid, sub);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice.subscription as string) || "";
        if (subId) {
          const sub = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(sub.customer as string);
          const firebaseUid = (customer as any)?.metadata?.firebaseUid || "";
          if (firebaseUid) {
            await persistFromSubscription(firebaseUid, sub);
          }
        }
        break;
      }

      // Optional: handle async payment outcomes
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
      default:
        // No-op for other events
        break;
    }

    // 200 tells Stripe the event was received successfully
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
