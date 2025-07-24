import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check the user's subscription status.
 */
/**
 * Check the user's subscription status.
 */
export async function checkSubscriptionStatus(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      subscriptionStatus: "none",
      subscriptionEndDate: null,
    };
  }

  const endsAt = subscription.endsAt as Date | null;
  const isActive = endsAt && endsAt.getTime() + 86_400_000 > Date.now();

  return {
    hasActiveSubscription: !!isActive,
    subscriptionStatus: isActive ? "active" : "expired",
    subscriptionEndDate: endsAt,
  };
}
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

  const endsAtDate = data.stripeCurrentPeriodEnd
    ? new Date(data.stripeCurrentPeriodEnd * 1000)
    : undefined;

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        endsAt: endsAtDate,
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId: data.stripePriceId,
      endsAt: endsAtDate,
    });
  }
}
