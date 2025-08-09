// src/lib/subscription.ts
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

type SubscriptionMetadata = {
  userId?: string;
  email?: string;
};

// Helpful alias to avoid name collisions with any other "Subscription" types
type StripeSub = Stripe.Subscription;

function getCustomerId(s: StripeSub): string | null {
  if (typeof s.customer === "string") return s.customer;
  return s.customer?.id ?? null;
}

function getPriceId(s: StripeSub): string | null {
  return s.items?.data?.[0]?.price?.id ?? null;
}

function isActiveStatus(
  status: Stripe.Subscription.Status,
  includePastDue = true
): boolean {
  if (status === "active" || status === "trialing") return true;
  if (includePastDue && status === "past_due") return true;
  return false;
}

export async function updateUserSubscription(
  subscription: Stripe.Subscription // keep the signature strongly typed
): Promise<void> {
  try {
    // Force the exact Stripe type (defensive against name shadowing)
    const sub = subscription as StripeSub;

    const meta = (sub.metadata ?? {}) as SubscriptionMetadata;
    const userIdFromMeta = meta.userId;
    const emailFromMeta = meta.email;

    const stripeCustomerId = getCustomerId(sub);
    const subscriptionId = sub.id;
    const status = sub.status;

    if (!stripeCustomerId) {
      console.error("❌ updateUserSubscription: Missing Stripe customer ID.", {
        subscriptionId,
      });
      return;
    }

    // Stripe epoch seconds → JS Date (guard for undefined)
    const currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : null;

    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
    const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;
    const canceledAt = sub.canceled_at
      ? new Date(sub.canceled_at * 1000)
      : null;

    const priceId = getPriceId(sub);
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
        const client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2025-06-30.basil",
        });
        const cust = await client.customers.retrieve(stripeCustomerId);
        if (!("deleted" in cust) && typeof cust !== "string") {
          email = cust.email ?? "";
        }
      } catch (e) {
        console.warn("⚠️ Could not fetch customer email", {
          stripeCustomerId,
          err: (e as Error).message,
        });
      }
    }

    const payload = {
      stripeCustomerId,
      subscriptionId,
      subscriptionStatus: status,
      subscriptionEndDate: currentPeriodEnd,
      stripePriceId: priceId,
      updatedAt: now,

      // Uncomment these if your schema has them:
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
