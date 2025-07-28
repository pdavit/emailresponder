// lib/subscription.ts

import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

/**
 * Updates the user's subscription information in the database.
 * This is triggered by Stripe webhook events like `checkout.session.completed`
 * and `customer.subscription.created`, etc.
 */
export async function updateUserSubscription(
  subscription: Stripe.Subscription | Stripe.Checkout.Session
) {
  try {
    // Extract customer ID
    const customerId = subscription.customer as string;

    // Try to find the user by Stripe customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      console.error("❌ No user found for customer ID:", customerId);
      return;
    }

    // Support both Subscription and Checkout.Session
    const isSub = "status" in subscription && "id" in subscription;

    const subscriptionId = isSub ? subscription.id : undefined;
    const subscriptionStatus = isSub ? subscription.status : undefined;

    // Log what we’re updating
    console.log("🔄 Updating user:", {
      userId: user.id,
      subscriptionId,
      subscriptionStatus,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionId: subscriptionId ?? undefined,
        subscriptionStatus: subscriptionStatus ?? undefined,
      },
    });

    console.log(`✅ Updated subscription info for ${user.email}: ${subscriptionStatus}`);
  } catch (error) {
    console.error("❌ Failed to update user subscription:", error);
  }
}

/**
 * Checks if the user has an active or trialing subscription.
 * Used to control access in middleware/API.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });

    const status = user?.subscriptionStatus ?? "none";
    console.log("🧠 Checking user subscription status:", status);

    return ["active", "trialing"].includes(status);
  } catch (error) {
    console.error("❌ Failed to check subscription status:", error);
    return false;
  }
}
