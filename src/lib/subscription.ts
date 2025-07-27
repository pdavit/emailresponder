import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Updates the user's subscription data in the database
 * after receiving a Stripe webhook event.
 */
export async function updateUserSubscription(subscription: any) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: {
      stripeCustomerId: customerId,
    },
  });

  if (!user) {
    console.error("❌ No user found for customer ID:", customerId);
    return;
  }

  const subscriptionStatus = subscription.status as string;
  const stripeSubscriptionId = subscription.id as string;

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      stripeSubscriptionId,
      stripeSubscriptionStatus: subscriptionStatus,
    },
  });

  console.log(`✅ Updated subscription for ${user.email}: ${subscriptionStatus}`);
}

/**
 * Checks if a user has an active Stripe subscription.
 * Useful for protecting premium routes.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      stripeSubscriptionStatus: true,
    },
  });

  return user?.stripeSubscriptionStatus === "active";
}
