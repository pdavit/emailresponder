import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

/**
 * Updates or creates a user in the DB using Stripe subscription metadata
 */
export async function updateUserSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("❌ updateUserSubscription: Missing userId in metadata.");
    return;
  }

  const stripeCustomerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const subscriptionStatus = subscription.status;

  // Optional: extract email from customer details (if set)
  const email = subscription.metadata?.email || "";

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

    console.log(`✅ Created user ${userId} with subscription`);
  }
}
