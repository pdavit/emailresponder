// src/app/api/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateUserSubscription } from "@/lib/subscription";

// For app routes this helps ensure we get a fresh handler
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function upsertUserFromSubscription(
  subscription: Stripe.Subscription,
  userId: string | null
) {
  // Try to pull userId from subscription metadata if not provided
  const metaUserId = (subscription.metadata?.userId || "").trim();
  const resolvedUserId = (userId || metaUserId || "").trim();

  if (!resolvedUserId) {
    console.error("❌ upsertUserFromSubscription: userId still missing");
    return;
  }

  const currentPeriodEnd = (subscription as any).current_period_end;
  const endDate =
    typeof currentPeriodEnd === "number" ? new Date(currentPeriodEnd * 1000) : null;

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? "";

  const payload = {
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    stripeCustomerId: stripeCustomerId ?? null,
    subscriptionEndDate: endDate,
    stripePriceId: priceId,
    updatedAt: new Date(),
  };

  const existing = await db.query.users.findFirst({
    where: eq(users.id, resolvedUserId),
  });

  if (existing) {
    await db.update(users).set(payload).where(eq(users.id, resolvedUserId));
  } else {
    await db.insert(users).values({
      id: resolvedUserId,
      email: subscription.metadata?.email ?? "",
      ...payload,
      createdAt: new Date(),
    });
  }

  // Keep your helper for any extra syncing you do
  await updateUserSubscription(subscription);
}

async function findUserIdByCustomerId(stripeCustomerId: string | null | undefined) {
  if (!stripeCustomerId) return null;
  const u = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, stripeCustomerId),
  });
  return u?.id ?? null;
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not defined");
    return new NextResponse("Webhook secret missing", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing Stripe signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    console.log("📦 Incoming event:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook verification failed:", err?.message || err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Prefer metadata on the session first
        let userId = session.metadata?.userId || null;
        let subscriptionId = (session.subscription as string) || null;

        // If missing, fetch an expanded session to grab everything
        if (!userId || !subscriptionId) {
          const full = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["subscription"],
          });

          userId =
            full.metadata?.userId ||
            (typeof full.subscription !== "string"
              ? full.subscription?.metadata?.userId || null
              : null) ||
            null;

          subscriptionId =
            (typeof full.subscription === "string"
              ? full.subscription
              : full.subscription?.id) || null;
        }

        // Last-ditch attempt: resolve userId by customer mapping in DB
        if (!userId) {
          const customerId =
            (typeof session.customer === "string"
              ? session.customer
              : session.customer?.id) || null;
          userId = await findUserIdByCustomerId(customerId);
        }

        if (!userId || !subscriptionId) {
          console.error(
            "❌ Missing userId or subscriptionId after all backfills",
            { userId, subscriptionId }
          );
          return new NextResponse("Missing metadata", { status: 400 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertUserFromSubscription(subscription, userId);
        console.log("✅ Synced after checkout.session.completed");
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Try metadata, then DB lookup by customer
        let userId = (subscription.metadata?.userId || "").trim();
        if (!userId) {
          const custId =
            (typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id) || null;
          userId = (await findUserIdByCustomerId(custId)) || "";
        }

        if (!userId) {
          console.error(`❌ Missing userId for ${event.type}`);
          break;
        }

        await upsertUserFromSubscription(subscription, userId);
        console.log(`✅ Handled ${event.type}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Figure out who this belongs to
        let userId = (subscription.metadata?.userId || "").trim();
        if (!userId) {
          const custId =
            (typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id) || null;
          userId = (await findUserIdByCustomerId(custId)) || "";
        }

        if (!userId) {
          console.error("❌ Could not resolve user for subscription.deleted");
          break;
        }

        await db
          .update(users)
          .set({
            subscriptionId: null,
            subscriptionStatus: "canceled",
            subscriptionEndDate: null,
            stripePriceId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`🗑️ Subscription deleted for user: ${userId}`);
        break;
      }

      default:
        // Totally fine—just log it so we know what else Stripe is sending us.
        console.log(`📬 Unhandled event type: ${event.type}`);
        break;
    }

    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    // Respond 200 so Stripe doesn’t retry forever while we deploy a fix
    return new NextResponse("handled with errors", { status: 200 });
  }
}
