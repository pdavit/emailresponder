// src/lib/subscription.ts
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

type SubscriptionMetadata = {
  userId?: string;
  email?: string;
};

function getCustomerId(s: Stripe.Subscription): string | null {
  if (typeof s.customer === "string") return s.customer;
  return s.customer?.id ?? null;
}

function getPriceId(s: Stripe.Subscription): string | null {
  return s.items?.data?.[0]?.price?.id ?? null;
}

function isActiveStatus(
  status: Stripe.Subscription.Status,
  includePastDue = true
): boolean {
  if (status === "active" || status === "trialing") return true;
  if (includePastDue && status === "past_due") return true; // your grace policy
  return false;
}

export async function updateUserSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const meta = (subscription.metadata ?? {}) as SubscriptionMetadata;
    const userIdFromMeta = meta.userId;
    const emailFromMeta = meta.email;

    const stripeCustomerId = getCustomerId(subscription);
    const subscriptionId = subscription.id;
    const status = subscription.status;

    if (!stripeCustomerId) {
      console.error("❌ updateUserSubscription: Missing Stripe customer ID.", {
        subscriptionId,
      });
      return;
    }

    // Stripe epoch seconds → JS Date
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;

    const cancelAt = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : null;

    const canceledAt = subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null;

    const priceId = getPriceId(subscription);
    const now = new Date();

    // Locate the row: prefer userId, then fallback by stripeCustomerId
    let userRow =
      userIdFromMeta
        ? await db.query.users.findFirst({ where: eq(users.id, userIdFromMeta) })
        : null;

    if (!userRow) {
      userRow = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, stripeCustomerId),
      });
    }

    // If we’ll need an email and don’t have it, try Stripe Customer
    let email = emailFromMeta ?? userRow?.email ?? "";
    if (!email && stripeCustomerId) {
      try {
        // Light best-effort fetch; safe if you already expanded customer elsewhere
        const cust = await (new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2025-06-30.basil",
        })).customers.retrieve(stripeCustomerId);
        if (!("deleted" in cust) && typeof cust !== "string") {
          email = cust.email ?? "";
        }
      } catch (e) {
        // Non-fatal
        console.warn("⚠️ Could not fetch customer email", {
          stripeCustomerId,
          err: (e as Error).message,
        });
      }
    }

    // Build payload matching your schema
    const payload = {
      stripeCustomerId,
      subscriptionId,
      subscriptionStatus: status,
      subscriptionEndDate: currentPeriodEnd,
      stripePriceId: priceId,
      updatedAt: now,

      // If your schema has these, uncomment:
      // trialEnd,
      // cancelAt,
      // canceledAt,
      // isActive: isActiveStatus(status),
    } as const;

    if (userRow) {
      await db.update(users).set(payload).where(eq(users.id, userRow.id));
      console.log("✅ Subscription updated", {
        userId: userRow.id,
        status,
        priceId,
      });
      return;
    }

    // No row found: only create if we have a Clerk user id
    if (!userIdFromMeta) {
      console.warn(
        "⚠️ updateUserSubscription: No matching user and no userId in metadata. Skipping insert.",
        { stripeCustomerId, subscriptionId }
      );
      return;
    }

    await db.insert(users).values({
      id: userIdFromMeta,
      email,
      ...payload,
      createdAt: now,
    });

    console.log("✅ New user created with subscription", {
      userId: userIdFromMeta,
      status,
      priceId,
    });
  } catch (err) {
    console.error("❌ updateUserSubscription error", {
      err: (err as Error).message,
    });
  }
}

/**
 * Validates access based on subscription status + not expired.
 * Accepts 'active' and 'trialing'. Optionally treat 'past_due' as grace.
 */
export async function checkSubscriptionStatus(
  userId: string,
  opts: { includePastDueGrace?: boolean } = {}
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const status = (user?.subscriptionStatus ?? "") as Stripe.Subscription.Status;
  const ok = isActiveStatus(status, !!opts.includePastDueGrace);

  // If you store cancelAt/canceledAt, you can add more rules here.
  const notExpired =
    !user?.subscriptionEndDate || user.subscriptionEndDate > new Date();

  const isValid = Boolean(ok && notExpired);

  if (!isValid) {
    console.warn("⚠️ Invalid access", {
      userId,
      status,
      end: user?.subscriptionEndDate?.toISOString() ?? "n/a",
    });
  }

  return isValid;
}
