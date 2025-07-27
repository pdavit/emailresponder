import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Updates the user's subscription information in the database.
 * Triggered via Stripe webhook events.
 */
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export async function updateUserSubscription(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  if (!status) {
    console.error("⚠️ Subscription status is missing or invalid.");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error("❌ No user found for customer ID:", customerId);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId,
      subscriptionStatus: status,
    },
  });

  console.log(`✅ Updated subscription for ${user.email}: ${status}`);
}
/**
 * Returns true if the user has an active or trialing Stripe subscription.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  return user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
}
