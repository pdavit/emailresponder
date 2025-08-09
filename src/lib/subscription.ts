// src/lib/subscription.ts
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

import Stripe from "stripe";        // value import for API calls
import type StripeNS from "stripe"; // types only

type StripeSub = StripeNS.Subscription;

type SubMeta = {
  userId?: string; // Clerk user id we stash in metadata
  email?: string;
};

/* ---------- small helpers ---------- */

function getCustomerId(s: StripeSub): string | null {
  if (typeof s.customer === "string") return s.customer;
  return s.customer?.id ?? null;
}

function getPriceId(s: StripeSub): string | null {
  return s.items?.data?.[0]?.price?.id ?? null;
}

function tsFromUnix(
  s: StripeSub,
  key: "current_period_end" | "trial_end" | "cancel_at" | "canceled_at"
): Date | null {
  const v = (s as any)[key];
  return typeof v === "number" ? new Date(v * 1000) : null;
}

function isAccessAllowed(
  status: StripeNS.Subscription.Status | undefined,
  { includePastDueGrace = true }: { includePastDueGrace?: boolean } = {}
): boolean {
  if (!status) return false;
  if (status === "active" || status === "trialing") return true;
  if (includePastDueGrace && status === "past_due") return true;
  return false;
}

/* ---------- main: write subscription to DB ---------- */

export async function updateUserSubscription(subscription: StripeNS.Subscription): Promise<void> {
  try {
    const sub = subscription as StripeSub;

    const meta: SubMeta = (sub.metadata ?? {}) as any;
    const userIdFromMeta = meta.userId;

    const stripeCustomerId = getCustomerId(sub);
    if (!stripeCustomerId) {
      console.error("❌ Missing stripeCustomerId on subscription", { subId: sub.id });
      return;
    }

    // Pull useful fields
    const payload = {
      stripeCustomerId,
      subscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionEndDate: tsFromUnix(sub, "current_period_end"),
      stripePriceId: getPriceId(sub),
      updatedAt: new Date(),
    } as const;

    // Find user row: prefer explicit userId, else by customer id
    let userRow =
      userIdFromMeta
        ? await db.query.users.findFirst({ where: eq(users.id, userIdFromMeta) })
        : null;

    if (!userRow) {
      userRow = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, stripeCustomerId),
      });
    }

    // Best-effort email (keep what we have, else pull from Stripe)
    let email = userRow?.email ?? meta.email ?? "";
    if (!email) {
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

    if (userRow) {
      await db.update(users).set({ ...payload, email }).where(eq(users.id, userRow.id));
      console.log("✅ Subscription updated", { userId: userRow.id, status: sub.status });
      return;
    }

    // No row found—create one only if we know the Clerk user id
    if (!userIdFromMeta) {
      console.warn(
        "⚠️ No matching user and no userId in metadata; skipping insert.",
        { stripeCustomerId, subId: sub.id }
      );
      return;
    }

    await db.insert(users).values({
      id: userIdFromMeta,
      email,
      ...payload,
      createdAt: new Date(),
    });

    console.log("✅ New user created with subscription", {
      userId: userIdFromMeta,
      status: sub.status,
    });
  } catch (err) {
    console.error("❌ updateUserSubscription error", { err: (err as Error).message });
  }
}

/* ---------- main: read/check access ---------- */

export async function checkSubscriptionStatus(
  userId: string,
  opts: { includePastDueGrace?: boolean } = {}
): Promise<boolean> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });

  const status = row?.subscriptionStatus as StripeNS.Subscription.Status | undefined;
  const allowed = isAccessAllowed(status, { includePastDueGrace: !!opts.includePastDueGrace });

  // Still block if we have an end date in the past
  const notExpired = !row?.subscriptionEndDate || row.subscriptionEndDate > new Date();

  const ok = Boolean(allowed && notExpired);

  if (!ok) {
    console.warn("⚠️ Invalid access", {
      userId,
      status: status ?? "",
      end: row?.subscriptionEndDate?.toISOString() ?? "n/a",
    });
  }

  return ok;
}
