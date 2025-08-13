// src/lib/subscription.ts
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import type StripeNS from "stripe";

type StripeSub = StripeNS.Subscription;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

function isActiveStatus(
  status: StripeNS.Subscription.Status | undefined | null,
  includePastDue = true
): boolean {
  if (!status) return false;
  if (status === "active" || status === "trialing") return true;
  if (includePastDue && status === "past_due") return true;
  return false;
}

function tsFromUnix(
  s: StripeSub,
  key: "current_period_end" | "trial_end" | "cancel_at" | "canceled_at"
): Date | null {
  const v = (s as any)[key];
  return typeof v === "number" ? new Date(v * 1000) : null;
}

function getPriceId(s: StripeSub): string | null {
  return s.items?.data?.[0]?.price?.id ?? null;
}

/**
 * Pull latest subscription for a customer from Stripe and upsert into `users`.
 * Returns normalized "isActive" decision.
 */
async function refreshFromStripeByCustomerId(stripeCustomerId: string) {
  // Most recent sub first
  const list = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 1,
    expand: ["data.items.data.price.product"],
  });

  const sub = list.data[0];
  if (!sub) {
    // No sub at Stripe – mark as none
    return {
      subscriptionId: null as string | null,
      subscriptionStatus: "" as "" | StripeNS.Subscription.Status,
      subscriptionEndDate: null as Date | null,
      stripePriceId: null as string | null,
      isActive: false,
    };
  }

  const subscriptionId = sub.id;
  const subscriptionStatus = sub.status;
  const subscriptionEndDate = tsFromUnix(sub, "current_period_end");
  const stripePriceId = getPriceId(sub);

  return {
    subscriptionId,
    subscriptionStatus,
    subscriptionEndDate,
    stripePriceId,
    isActive: isActiveStatus(subscriptionStatus),
  };
}

/**
 * Upsert values on the user row.
 */
async function upsertUserSubscription(
  userId: string,
  data: {
    subscriptionId: string | null;
    subscriptionStatus: "" | StripeNS.Subscription.Status;
    subscriptionEndDate: Date | null;
    stripePriceId: string | null;
  }
) {
  const now = new Date();
  await db
    .update(users)
    .set({
      subscriptionId: data.subscriptionId ?? null,
      subscriptionStatus: data.subscriptionStatus ?? "",
      subscriptionEndDate: data.subscriptionEndDate ?? null,
      stripePriceId: data.stripePriceId ?? null,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
}

/**
 * Public: called by middleware/routes to decide access.
 * - If DB already has a status, use it (and allow when active/trialing/past_due*).
 * - If missing/stale, pull from Stripe, save, and then decide.
 */
export async function checkSubscriptionStatus(
  userId: string,
  opts: { includePastDueGrace?: boolean } = {}
): Promise<boolean> {
  const includePastDueGrace = !!opts.includePastDueGrace;

  // 1) Read current cache
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });

  // If we have a status and it looks fine, decide immediately.
  const cachedStatus = (row?.subscriptionStatus ?? "") as
    | ""
    | StripeNS.Subscription.Status;

  const cachedEnd = row?.subscriptionEndDate ?? null;
  const cachedOk =
    isActiveStatus(cachedStatus, includePastDueGrace) &&
    (!cachedEnd || cachedEnd > new Date());

  if (cachedStatus && cachedOk) return true;

  // 2) Otherwise, try to refresh from Stripe (requires a stored customer id)
  const stripeCustomerId = row?.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    console.warn("⚠️ No stripeCustomerId on user; denying access", { userId });
    return false;
  }

  try {
    const latest = await refreshFromStripeByCustomerId(stripeCustomerId);
    await upsertUserSubscription(userId, latest);

    const ok =
      isActiveStatus(latest.subscriptionStatus, includePastDueGrace) &&
      (!latest.subscriptionEndDate || latest.subscriptionEndDate > new Date());

    if (!ok) {
      console.warn("⚠️ Invalid access after refresh", {
        userId,
        status: latest.subscriptionStatus ?? "",
        end: latest.subscriptionEndDate?.toISOString() ?? "n/a",
      });
    }
    return ok;
  } catch (err) {
    console.error("❌ Stripe refresh failed", {
      userId,
      err: (err as Error).message,
    });
    return false;
  }
}

/**
 * Webhook entry-point (kept for when webhooks arrive).
 * You can keep your existing implementation; this one normalizes and saves.
 */
export async function updateUserSubscription(subscription: StripeNS.Subscription) {
  try {
    const sub = subscription as StripeSub;
    const stripeCustomerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

    if (!stripeCustomerId) {
      console.error("❌ Missing stripeCustomerId on webhook sub", { id: sub.id });
      return;
    }

    // Find user row by stripeCustomerId
    const row = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, stripeCustomerId),
    });
    if (!row) {
      console.warn("⚠️ Webhook for unknown customer; skipping", {
        stripeCustomerId,
        subId: sub.id,
      });
      return;
    }

    const payload = {
      subscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionEndDate: tsFromUnix(sub, "current_period_end"),
      stripePriceId: getPriceId(sub),
    };

    await upsertUserSubscription(row.id, payload);
    console.log("✅ Subscription updated from webhook", {
      userId: row.id,
      status: sub.status,
    });
  } catch (err) {
    console.error("❌ updateUserSubscription error", { err: (err as Error).message });
  }
}
