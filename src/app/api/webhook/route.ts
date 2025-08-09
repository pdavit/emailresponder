// app/api/webhook/route.ts
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUserSubscription } from "@/lib/subscription";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function findUserIdFromStripe(
  event: Stripe.Event
): Promise<string | null> {
  // Try subscription first
  if (event.data.object && (event.type.startsWith("customer.subscription"))) {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.metadata?.userId) return sub.metadata.userId;

    // fall back to customer metadata if needed
    const cust = await stripe.customers.retrieve(sub.customer as string);
    if (!cust.deleted && typeof cust !== "string") {
      return (cust.metadata?.userId as string) ?? null;
    }
  }

  // Try checkout.session
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    if (cs.metadata?.userId) return cs.metadata.userId;

    // expand subscription to look there
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

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = (await headers()).get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const userId = (cs.metadata?.userId as string) ?? (await findUserIdFromStripe(event));
        if (!userId) break;

        if (cs.subscription) {
          const sub = await stripe.subscriptions.retrieve(cs.subscription as string);
          await updateUserSubscription({
            userId,
            stripeCustomerId: cs.customer as string,
            stripeSubscriptionId: sub.id,
            priceId: (sub.items.data[0]?.price?.id) ?? null,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end,
            trialEnd: sub.trial_end,
            cancelAt: sub.cancel_at,
            canceledAt: sub.canceled_at,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId ?? (await findUserIdFromStripe(event));
        if (!userId) break;

        await updateUserSubscription({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          priceId: (sub.items.data[0]?.price?.id) ?? null,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          trialEnd: sub.trial_end,
          cancelAt: sub.cancel_at,
          canceledAt: sub.canceled_at,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId ?? (await findUserIdFromStripe(event));
        if (!userId) break;

        await updateUserSubscription({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          priceId: (sub.items.data[0]?.price?.id) ?? null,
          status: "canceled",
          currentPeriodEnd: sub.current_period_end,
          trialEnd: sub.trial_end,
          cancelAt: sub.cancel_at,
          canceledAt: sub.canceled_at ?? Math.floor(Date.now() / 1000),
        });
        break;
      }

      default:
        // ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new NextResponse("Server error", { status: 500 });
  }
}
