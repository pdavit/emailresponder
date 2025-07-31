import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

type SubscriptionMetadata = {
  userId?: string;
  email?: string;
};

/**
 * Syncs a Stripe subscription to your database,
 * updating an existing user or creating a new one if not found.
 */
export async function updateUserSubscription(subscription: Stripe.Subscription): Promise<void> {
  const metadata = subscription.metadata as SubscriptionMetadata;
  const userId = metadata?.userId;
  const email = metadata?.email ?? "";

  if (!userId) {
    console.error("❌ updateUserSubscription: Missing userId in metadata.");
    return;
  }

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const subscriptionId = subscription.id;
  const subscriptionStatus = subscription.status;

  if (!stripeCustomerId) {
    console.error("❌ updateUserSubscription: Missing Stripe customer ID.");
    return;
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const now = new Date();

  if (existingUser) {
    await db
      .update(users)
      .set({
        stripeCustomerId,
        subscriptionId,
        subscriptionStatus,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    console.log(`✅ Updated subscription for user ${userId}`);
  } else {
    await db.insert(users).values({
      id: userId,
      email,
      stripeCustomerId,
      subscriptionId,
      subscriptionStatus,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ Created new user ${userId} with subscription`);
  }
}

/**
 * Checks whether the user's subscription is active.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user?.subscriptionStatus === "active";
}
