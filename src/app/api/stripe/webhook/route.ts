import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";        // raw body support
export const dynamic = "force-dynamic"; // avoid caching

// TODO: replace with real DB calls
async function linkCustomerToUser(_opts: { firebaseUid: string; customerId: string }) {}
async function setSubscriptionStatus(_opts: {
  firebaseUid: string; subscriptionId: string; priceId: string | null;
  status: string; currentPeriodEnd: number | null;
}) {}

// Optional quick GET for liveness
export async function GET() { return NextResponse.json({ ok: true }); }

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    const raw = await req.text(); // IMPORTANT: raw body
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error("Bad signature:", err.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const firebaseUid = (session.client_reference_id as string) ?? "";
        const customerId = (session.customer as string) ?? "";
        const subscriptionId = (session.subscription as string) ?? "";

        if (firebaseUid && customerId) {
          await linkCustomerToUser({ firebaseUid, customerId });
        }
        if (firebaseUid && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const priceId = sub.items.data[0]?.price?.id ?? null;
          await setSubscriptionStatus({
            firebaseUid, subscriptionId, priceId,
            status: sub.status, currentPeriodEnd: (sub as any).current_period_end ?? null,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const firebaseUid = (customer as any)?.metadata?.firebaseUid || "";
        const priceId = sub.items.data[0]?.price?.id ?? null;
        if (firebaseUid) {
          await setSubscriptionStatus({
            firebaseUid, subscriptionId: sub.id, priceId,
            status: sub.status, currentPeriodEnd: (sub as any).current_period_end ?? null,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = (inv as any).subscription as string;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId) as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(sub.customer as string);
          const firebaseUid = (customer as any)?.metadata?.firebaseUid || "";
          const priceId = sub.items.data[0]?.price?.id ?? null;
          if (firebaseUid) {
            await setSubscriptionStatus({
              firebaseUid, subscriptionId: sub.id, priceId,
              status: sub.status, currentPeriodEnd: (sub as any).current_period_end ?? null,
            });
          }
        }
        break;
      }
      default:
        // ignore others for now
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
