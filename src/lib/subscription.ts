// src/lib/subscription.ts
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

import Stripe from "stripe";
import type StripeNS from "stripe";

type StripeSub = StripeNS.Subscription;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

/* ---------------------------- helpers ---------------------------- */

function isActiveStatus(
  status?: StripeNS.Subscription.Status | null,
  includePastDue = true
): boolean {
  if (!status) return false;
  if (status === "active" || status === "trialing") return true;
  if (includePastDue && status === "past_due") return true;
  return false;
}

function toStripeStatus(s?: string | null): StripeNS.Subscription.Status | null {
  if (!s) return null;
  const allowed: ReadonlyArray<StripeNS.Subscription.Status> = [
    "trialing",
    "active",
    "past_due",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "paused",
    "unpaid",
  ] as const;
  return (allowed as readonly string[]).includes(s) ? (s as StripeNS.Subscription.Status) : null;
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

/* -------- pull latest from Stripe and upsert into users -------- */

async function refreshFromStripeByCustomerId(stripeCustomerId: string) {
  const list = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 1,
    expand: ["data.items.data.price.product"],
  });

  const sub = list.data[0];
  if (!sub) {
    return {
      subscriptionId: null as string | null,
      subscriptionStatus: null as StripeNS.Subscription.Status | null,
      subscriptionEndDate: null as Date | null,
      stripePriceId: null as string | null,
    };
  }

  return {
    subscriptionId: sub.id,
    subscriptionStatus: sub.status,
    subscriptionEndDate: tsFromUnix(sub, "current_period_end"),
    stripePriceId: getPriceId(sub),
  };
}

async function upsertUserSubscription(
  userId: string,
  data: {
    subscriptionId: string | null;
    subscriptionStatus: StripeNS.Subscription.Status | null;
    subscriptionEndDate: Date | null;
    stripePriceId: string | null;
  }
) {
  const now = new Date();
  await db
    .update(users)
    .set({
      subscriptionId: data.subscriptionId ?? null,
      subscriptionStatus: data.subscriptionStatus ?? null,
      subscriptionEndDate: data.subscriptionEndDate ?? null,
      stripePriceId: data.stripePriceId ?? null,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
}

/* --------------------- public: check access --------------------- */

export async function checkSubscriptionStatus(
  userId: string,
  opts: { includePastDueGrace?: boolean } = {}
): Promise<boolean> {
  const includePastDueGrace = !!opts.includePastDueGrace;

  // 1) Read cache
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });

  const cachedStatus = toStripeStatus(row?.subscriptionStatus);
  const cachedEnd = row?.subscriptionEndDate ?? null;
  const cachedOk =
    isActiveStatus(cachedStatus, includePastDueGrace) &&
    (!cachedEnd || cachedEnd > new Date());

  if (cachedStatus && cachedOk) return true;

  // 2) Refresh from Stripe if we have a customer id
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

/* ---------------- webhook updater (kept warm) ---------------- */

export async function updateUserSubscription(subscription: StripeNS.Subscription) {
  try {
    const sub = subscription as StripeSub;
    const stripeCustomerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

    if (!stripeCustomerId) {
      console.error("❌ Missing stripeCustomerId on webhook sub", { id: sub.id });
      return;
    }

    // Find user by customer id (we also create rows at checkout time)
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

    await upsertUserSubscription(row.id, {
      subscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionEndDate: tsFromUnix(sub, "current_period_end"),
      stripePriceId: getPriceId(sub),
    });

    console.log("✅ Subscription updated from webhook", {
      userId: row.id,
      status: sub.status,
    });
  } catch (err) {
    console.error("❌ updateUserSubscription error", { err: (err as Error).message });
  }
}
