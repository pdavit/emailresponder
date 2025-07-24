import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { subscriptions as subscriptionsTable } from "@/lib/db/schema";

type Subscription = InferSelectModel<typeof subscriptionsTable>;

/**
 * Check the user's subscription status.
 */
export async function checkSubscriptionStatus(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId)) as [Subscription?];

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      subscriptionStatus: "none",
      subscriptionEndDate: null,
    };
  }

  const stripePeriod = subscription.stripeCurrentPeriodEnd as Date | null;

  const isActive =
    stripePeriod && stripePeriod.getTime() + 86_400_000 > Date.now();

  return {
    hasActiveSubscription: !!isActive,
    subscriptionStatus: isActive ? "active" : "expired",
    subscriptionEndDate: stripePeriod,
  };
}

/**
 * Create or update the user's subscription.
 */
export async function updateUserSubscription(
  userId: string,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeCurrentPeriodEnd?: number;
  }
) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        ...data,
        stripeCurrentPeriodEnd: data.stripeCurrentPeriodEnd
          ? new Date(data.stripeCurrentPeriodEnd * 1000)
          : undefined,
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId: data.stripePriceId,
      stripeCurrentPeriodEnd: data.stripeCurrentPeriodEnd
        ? new Date(data.stripeCurrentPeriodEnd * 1000)
        : undefined,
    });
  }
}
