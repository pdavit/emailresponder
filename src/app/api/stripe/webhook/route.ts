// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe"; // type only
import stripe from "@/lib/stripe"; // configured server Stripe client

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";        // Stripe SDK needs Node
export const dynamic = "force-dynamic"; // no caching for webhooks

// --- Health check (Stripe may ping, and useful for uptime) ---
export async function GET() {
  return NextResponse.json({ ok: true });
}

/* ------------------------- Firestore helpers ------------------------- */

function billingDoc(uid: string) {
  // You can change the path shape if you prefer.
  return adminDb.collection("users").doc(uid);
}

async function linkCustomerToUser(opts: { firebaseUid: string; customerId: string }) {
  const { firebaseUid, customerId } = opts;

  // Persist on your user doc for later reads
  await billingDoc(firebaseUid).set(
    {
      billing: {
        customerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );

  // Ensure future Stripe events can be mapped back to this user without DB lookups
  try {
    await stripe.customers.update(customerId, {
      metadata: { firebaseUid },
    });
  } catch {
    // Non-fatal
  }
}

function getPeriodEnd(sub: any): number | null {
  // Defensively support both shapes that appear in different TS versions
  return sub?.current_period_end ?? sub?.currentPeriodEnd ?? null;
}

async function setSubscriptionStatus(opts: {
  firebaseUid: string;
  subscriptionId: string;
  priceId: string | null;
  status: string;
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
    { merge: true },
  );
}

/* ---------------------------- Main handler --------------------------- */

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return new NextResponse("Misconfigured webhook", { status: 500 });
  }

  let event: Stripe.Event;

  // Stripe requires the *raw* body for signature verification
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      /* ----- User completes Checkout ----- */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Prefer metadata, fall back to client_reference_id if you set it
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
            subscriptionId,
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

      /* ----- Subscription lifecycle changes ----- */
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Map back to your user via customer metadata.firebaseUid
        const customer = await stripe.customers.retrieve(customerId);
        const firebaseUid = (customer as any)?.metadata?.firebaseUid || "";

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

      /* ----- Payment failed (often moves sub to past_due) ----- */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const customerId = (invoice.customer as string) ?? null;
        const subId: string | null = (invoice as any)?.subscription ?? null;

        let sub: Stripe.Subscription | null = null;

        if (subId) {
          sub = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
        } else if (customerId) {
          const list = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 1,
          });
          sub = list.data[0] ?? null;
        }

        if (sub && customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          const firebaseUid = (customer as any)?.metadata?.firebaseUid || "";
          const priceId = sub.items?.data?.[0]?.price?.id ?? null;

          if (firebaseUid) {
            await setSubscriptionStatus({
              firebaseUid,
              subscriptionId: sub.id,
              priceId,
              status: sub.status, // often 'past_due' here
              currentPeriodEnd: getPeriodEnd(sub),
            });
          }
        }
        break;
      }

      // Optional: handle async payment results, etc.
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
      default:
        // no-op for other events you don't care about
        break;
    }

    // 200 tells Stripe we processed successfully
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
