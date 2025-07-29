import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { users } from "@/db/schema";

/**
 * Updates the user's subscription info in the database.
 * Handles Stripe events like checkout.session.completed and customer.subscription.updated.
 */
export async function updateUserSubscription(
  subscription: Stripe.Subscription | Stripe.Checkout.Session
) {
  try {
    const customerId = subscription.customer as string;

    // ✅ Find user by stripeCustomerId
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));

    const isSubscription = "status" in subscription && "id" in subscription;
    const subscriptionId = isSubscription ? subscription.id : null;
    const subscriptionStatus = isSubscription ? subscription.status : null;

    if (user) {
      console.log("🔄 Updating user by stripeCustomerId:", {
        userId: user.id,
        subscriptionId,
        subscriptionStatus,
      });

      await db
        .update(users)
        .set({
          subscriptionId,
          subscriptionStatus,
        })
        .where(eq(users.id, user.id));

      console.log(`✅ Updated subscription for ${user.email}`);
      return;
    }

    // ❗Fallback via metadata.userId
    const metadataUserId =
      "metadata" in subscription ? subscription.metadata?.userId : null;

    if (metadataUserId) {
      console.warn("⚠️ No user by stripeCustomerId. Using metadata fallback:", metadataUserId);

      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          subscriptionId,
          subscriptionStatus,
        })
        .where(eq(users.id, metadataUserId));

      console.log(`✅ Patched user ${metadataUserId} with Stripe subscription info`);
    } else {
      console.error("❌ Could not update subscription — no user match or metadata fallback");
    }
  } catch (error) {
    console.error("❌ Failed to update user subscription:", error);
  }
}

/**
 * Checks if a user has an active or trialing subscription.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ subscriptionStatus: users.subscriptionStatus })
      .from(users)
      .where(eq(users.id, userId));

    const status = user?.subscriptionStatus ?? "none";
    console.log("🧠 Subscription status check:", { userId, status });

    return ["active", "trialing"].includes(status);
  } catch (error) {
    console.error("❌ Failed to check subscription status:", error);
    return false;
  }
}
