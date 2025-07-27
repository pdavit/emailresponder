// lib/subscription.ts
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

/**
 * Updates the user's subscription data in the database
 * after receiving a Stripe webhook event.
 */
export async function updateUserSubscription(
  subscription: Stripe.Subscription | Stripe.Checkout.Session
) {
  const customerId = subscription.customer as string;
  const subscriptionStatus = (subscription as Stripe.Subscription).status;
  const stripeSubscriptionId = subscription.id;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('❌ No user found for customer ID:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
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
    where: { id: userId },
    select: {
      stripeSubscriptionStatus: true,
    },
  });

  return user?.stripeSubscriptionStatus === 'active';
}
