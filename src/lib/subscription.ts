import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Define expected structure for Stripe metadata
type SubscriptionMetadata = {
  userId?: string;
  email?: string;
};

/**
 * Updates or creates a user record in the database using Stripe subscription data.
 * Ensures that the subscription info is correctly synced for access control.
 */
export async function updateUserSubscription(subscription: Stripe.Subscription): Promise<void> {
  const metadata = subscription.metadata as SubscriptionMetadata;
  const userId = metadata?.userId;
  const email = metadata?.email ?? "";
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  const subscriptionId = subscription.id;
  const subscriptionStatus = subscription.status;
  const now = new Date();

  if (!userId) {
    console.error("❌ updateUserSubscription: Missing userId in Stripe metadata.");
    return;
  }

  if (!stripeCustomerId) {
    console.error("❌ updateUserSubscription: Missing Stripe customer ID.");
    return;
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

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

    console.log(`✅ Subscription updated for user: ${userId}`);
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

    console.log(`✅ New user created with subscription: ${userId}`);
  }
}

/**
 * Validates whether a user has access based on their subscription status.
 * Accepts both 'active' and 'trialing' as valid subscription states.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const status = user?.subscriptionStatus ?? "";
  const isValid = ["active", "trialing"].includes(status);

  if (!isValid) {
    console.warn(`⚠️ User ${userId} has invalid or inactive subscription status: ${status}`);
  }

  return isValid;
}
