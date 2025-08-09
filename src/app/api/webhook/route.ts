// app/api/webhook/route.ts
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUserSubscription } from "@/lib/subscription";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Try to resolve a Clerk userId for this event.
async function resolveUserId(event: Stripe.Event): Promise<string | null> {
  // 1) If event is about a subscription, check its metadata and customer
  if (event.type.startsWith("customer.subscription")) {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.metadata?.userId) return sub.metadata.userId;

    const cust = await stripe.customers.retrieve(sub.customer as string);
    if (!cust.deleted && typeof cust !== "string") {
      return (cust.metadata?.userId as string) ?? null;
    }
  }

  // 2) If event is about a checkout session, check metadata, then sub, then customer
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    if (cs.metadata?.userId) return cs.metadata.userId;

    if (cs.subscription) {
      const sub = await stripe.subscriptions.retrieve(cs.subscription as string);
      if (sub.metadata?.userId) return sub.metadata.userId;

      const cust = await stripe.customers.retrieve(cs.customer as string);
      if (!cust.deleted && typeof cust !== "string") {
        return (cust.metadata?.userId as string) ?? null;
      }
    }
  }

  return null;
}

// Make sure the subscription object has metadata.userId before we pass it along.
async function ensureUserIdOnSubscription(
  sub: Stripe.Subscription,
  fallbackUserId: string | null
): Promise<Stripe.Subscription> {
  if (!sub.metadata?.userId && fallbackUserId) {
    sub.metadata = { ...(sub.metadata ?? {}), userId: fallbackUserId };
  }
  return sub;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const userId =
          (cs.metadata?.userId as string | undefined) ?? (await resolveUserId(event));
        if (!userId) break;

        if (cs.subscription) {
          const sub = await stripe.subscriptions.retrieve(cs.subscription as string);
          const subWithUser = await ensureUserIdOnSubscription(sub, userId);
          await updateUserSubscription(subWithUser);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.userId as string | undefined) ?? (await resolveUserId(event));
        const subWithUser = await ensureUserIdOnSubscription(sub, userId);
        await updateUserSubscription(subWithUser);
        break;
      }

      // (Optional) If you want to react on invoices (e.g., mark active on payment):
      // case "invoice.payment_succeeded": {
      //   const inv = event.data.object as Stripe.Invoice;
      //   if (inv.subscription) {
      //     const userId = await resolveUserId(event);
      //     const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
      //     const subWithUser = await ensureUserIdOnSubscription(sub, userId);
      //     await updateUserSubscription(subWithUser);
      //   }
      //   break;
      // }

      default:
        // Ignore other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new NextResponse("Server error", { status: 500 });
  }
}
