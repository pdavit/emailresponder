// src/lib/subscription.ts
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";            // value import (we use it to fetch customer)
import type StripeNS from "stripe";     // type-only import to avoid collisions

type StripeSub = StripeNS.Subscription;

type SubscriptionMetadata = {
  userId?: string;
  email?: string;
};

function getCustomerId(s: StripeSub): string | null {
  if (typeof s.customer === "string") return s.customer;
  return s.customer?.id ?? null;
}

function getPriceId(s: StripeSub): string | null {
  return s.items?.data?.[0]?.price?.id ?? null;
}

// Read snake_case timestamps safely (bypasses TS name-collision issues)
function tsFromUnix(
  s: StripeSub,
  key: "current_period_end" | "trial_end" | "cancel_at" | "canceled_at"
) {
  const v = (s as any)[key];
  return typeof v === "number" ? new Date(v * 1000) : null;
}

function isActiveStatus(
  status: StripeNS.Subscription.Status,
  includePastDue = true
): boolean {
  if (status === "active" || status === "trialing") return true;
  if (includePastDue && status === "past_due") return true;
  return false;
}

export async function updateUserSubscription(subscription: StripeNS.Subscription): Promise<void> {
  try {
    const sub = subscription as StripeSub;

    const meta = (sub.metadata ?? {}) as SubscriptionMetadata;
    const userIdFromMeta = meta.userId;
    const emailFromMeta = meta.email;

    const stripeCustomerId = getCustomerId(sub);
    const subscriptionId = sub.id;
    const status = sub.status;

    if (!stripeCustomerId) {
      console.error("❌ updateUserSubscription: Missing Stripe customer ID.", { subscriptionId });
      return;
    }

    const currentPeriodEnd = tsFromUnix(sub, "current_period_end");
    const trialEnd        = tsFromUnix(sub, "trial_end");
    const cancelAt        = tsFromUnix(sub, "cancel_at");
    const canceledAt      = tsFromUnix(sub, "canceled_at");

    const priceId = getPriceId(sub);
    const now = new Date();

    // Prefer userId, else look up by stripeCustomerId
    let userRow =
      userIdFromMeta
        ? await db.query.users.findFirst({ where: eq(users.id, userIdFromMeta) })
        : null;

    if (!userRow) {
      userRow = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, stripeCustomerId),
      });
    }

    // Best-effort email
    let email = emailFromMeta ?? userRow?.email ?? "";
    if (!email && stripeCustomerId) {
      try {
        const client = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" });
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
      // Uncomment if you have these columns:
      // trialEnd,
      // cancelAt,
      // canceledAt,
      // isActive: isActiveStatus(status),
    } as const;

    if (userRow) {
      await db.update(users).set(payload).where(eq(users.id, userRow.id));
      console.log("✅ Subscription updated", { userId: userRow.id, status, priceId });
      return;
    }

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

    console.log("✅ New user created with subscription", { userId: userIdFromMeta, status, priceId });
  } catch (err) {
    console.error("❌ updateUserSubscription error", { err: (err as Error).message });
  }
}

/**
 * Validates access based on subscription status + not expired.
 */
export async function checkSubscriptionStatus(
  userId: string,
  opts: { includePastDueGrace?: boolean } = {}
): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  const status = (user?.subscriptionStatus ?? "") as StripeNS.Subscription.Status;
  const ok = isActiveStatus(status, !!opts.includePastDueGrace);
  const notExpired = !user?.subscriptionEndDate || user.subscriptionEndDate > new Date();

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
