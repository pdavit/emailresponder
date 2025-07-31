import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

/**
 * Updates or creates a user in the DB using Stripe subscription metadata
 */
export async function updateUserSubscription(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata;
  const userId = metadata?.userId;
  const email = metadata?.email ?? "";

  if (!userId) {
    console.error("❌ updateUserSubscription: Missing userId in metadata.");
    return;
  }

  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const subscriptionId = subscription.id;
  const subscriptionStatus = subscription.status;

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
        updatedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Created new user ${userId} with subscription`);
  }
}
