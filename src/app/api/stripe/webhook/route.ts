// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import stripe from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Health check
export async function GET() {
  return NextResponse.json({ ok: true });
}

/* ---------------------------- Firestore helpers ---------------------------- */

function userDoc(uid: string) {
  return adminDb.collection("users").doc(uid);
}

function gmailDoc(emailLower: string) {
  return adminDb.collection("gmailSubs").doc(emailLower);
}

// Idempotency guard using Firestore (single write per event id)
async function isDuplicate(eventId: string): Promise<boolean> {
  const ref = adminDb.collection("_stripe_events").doc(eventId);
  try {
    await ref.create({ receivedAt: FieldValue.serverTimestamp() });
    return false;
  } catch (e: any) {
    if (e?.code === 6 || /already exists/i.test(String(e?.message))) return true;
    throw e;
  }
}

/* ----------------------------- Stripe helpers ----------------------------- */

function asUnix(v?: number | string | null): number | null {
  if (!v && v !== 0) return null;
  if (typeof v === "number") return v;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

function activeFromStatus(status?: Stripe.Subscription.Status | string | null): boolean {
  return status === "active" || status === "trialing";
}

async function getUidFromCustomer(customerId: string): Promise<string> {
  const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  return (customer?.metadata as any)?.firebaseUid || "";
}

async function getEmailFromCustomer(customerId: string): Promise<string | null> {
  const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  return (customer?.email ?? null) || null;
}

/* --------------------------- Writers (Firestore) --------------------------- */

async function linkCustomerToUser(opts: { firebaseUid: string; customerId: string }) {
  const { firebaseUid, customerId } = opts;

  await userDoc(firebaseUid).set(
    {
      billing: {
        customerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  // Ensure future events map back to this user
  try {
    await stripe.customers.update(customerId, { metadata: { firebaseUid } });
  } catch {
    /* non-fatal */
  }
}

async function writeUserSubscription(opts: {
  firebaseUid: string;
  subscriptionId: string;
  priceId: string | null;
  status: Stripe.Subscription.Status | string;
  currentPeriodEnd: number | null;
}) {
  const { firebaseUid, subscriptionId, priceId, status, currentPeriodEnd } = opts;

  await userDoc(firebaseUid).set(
    {
      billing: {
        subscriptionId,
        priceId,
        status,
        currentPeriodEnd,
        active: activeFromStatus(status),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

async function writeGmailSubscription(opts: {
  email: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
  status?: Stripe.Subscription.Status | string | null;
  currentPeriodEnd?: number | null;
}) {
  const emailLower = opts.email.trim().toLowerCase();
  if (!emailLower) return;

  await gmailDoc(emailLower).set(
    {
      subscription: {
        id: opts.subscriptionId ?? null,
        status: opts.status ?? null,
        priceId: opts.priceId ?? null,
        currentPeriodEnd: opts.currentPeriodEnd ?? null,
      },
      active: activeFromStatus(opts.status ?? null),
      customerId: opts.customerId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/* ------------------------ Extractors per event type ------------------------ */

function firstPriceId(sub: Stripe.Subscription | null): string | null {
  return sub?.items?.data?.[0]?.price?.id ?? null;
}

function getPeriodEnd(sub: Stripe.Subscription | any): number | null {
  // Prefer current period end; fall back to trial end
  return (
    asUnix(sub?.current_period_end) ??
    asUnix(sub?.currentPeriodEnd) ??
    asUnix(sub?.trial_end) ??
    asUnix(sub?.trialEnd) ??
    null
  );
}

/* --------------------------------- Handler -------------------------------- */

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return new NextResponse("Misconfigured webhook", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    // Stripe needs the raw body for signature verification
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Idempotency
  try {
    const dup = await isDuplicate(event.id);
    if (dup) return NextResponse.json({ received: true, deduped: true });
  } catch (e) {
    console.warn("⚠️ Dedupe check failed, proceeding anyway:", e);
  }

  try {
    switch (event.type) {
      /* ------------------------ Checkout completed ------------------------ */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const firebaseUid =
          ((session.metadata as any)?.firebaseUid as string) ||
          ((session.client_reference_id as string) ?? "");

        const customerId = (session.customer as string) ?? "";
        if (firebaseUid && customerId) {
          await linkCustomerToUser({ firebaseUid, customerId });
        }

        // Capture email for Gmail add-on path
        const emailFromSession =
          session.customer_details?.email ||
          ((session.metadata as any)?.email as string | undefined) ||
          null;

        const subscriptionId = (session.subscription as string) || "";
        let sub: Stripe.Subscription | null = null;

        if (subscriptionId) {
          sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
        } else if (customerId) {
          const list = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 1,
          });
          sub = list.data[0] ?? null;
        }

        const priceId = firstPriceId(sub);
        const status = sub?.status ?? null;
        const cpe = sub ? getPeriodEnd(sub) : null;

        // Write UID-based doc (if present)
        if (firebaseUid && sub) {
          await writeUserSubscription({
            firebaseUid,
            subscriptionId: sub.id,
            priceId,
            status: sub.status,
            currentPeriodEnd: cpe,
          });
        }

        // Write email-based doc for Gmail add-on
        const email =
          emailFromSession ||
          (customerId ? await getEmailFromCustomer(customerId) : null);

        if (email) {
          await writeGmailSubscription({
            email,
            customerId,
            subscriptionId: sub?.id ?? null,
            priceId,
            status,
            currentPeriodEnd: cpe,
          });
        }
        break;
      }

      /* ------------------- Subscription lifecycle changes ------------------ */
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // UID path
        const firebaseUid = await getUidFromCustomer(customerId);
        if (firebaseUid) {
          await writeUserSubscription({
            firebaseUid,
            subscriptionId: sub.id,
            priceId: firstPriceId(sub),
            status: sub.status,
            currentPeriodEnd: getPeriodEnd(sub),
          });
        }

        // Gmail email cache path
        const email = await getEmailFromCustomer(customerId);
        if (email) {
          await writeGmailSubscription({
            email,
            customerId,
            subscriptionId: sub.id,
            priceId: firstPriceId(sub),
            status: sub.status,
            currentPeriodEnd: getPeriodEnd(sub),
          });
        }
        break;
      }

      /* --------------------------- Payment failed -------------------------- */
      case "invoice.payment_failed": {
        // Some Stripe TS versions don't expose `subscription` on Invoice.
        type InvoiceMaybeSub = Stripe.Invoice & {
          subscription?: string | { id: string } | null;
        };

        const invoice = event.data.object as InvoiceMaybeSub;
        const customerId = (invoice.customer as string) ?? null;

        const subId: string | null =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null;

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

        const priceId = firstPriceId(sub);
        const status = sub?.status ?? "past_due";
        const cpe = sub ? getPeriodEnd(sub) : null;

        // UID path
        if (sub && customerId) {
          const firebaseUid = await getUidFromCustomer(customerId);
          if (firebaseUid) {
            await writeUserSubscription({
              firebaseUid,
              subscriptionId: sub.id,
              priceId,
              status,
              currentPeriodEnd: cpe,
            });
          }
        }

        // Gmail email cache path
        if (customerId) {
          const email = await getEmailFromCustomer(customerId);
          if (email) {
            await writeGmailSubscription({
              email,
              customerId,
              subscriptionId: sub?.id ?? null,
              priceId,
              status,
              currentPeriodEnd: cpe,
            });
          }
        }
        break;
      }

      default:
        // other events can be ignored or logged
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
