import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

/**
 * Updates the user's subscription information in the database.
 * Triggered via Stripe webhook events.
 */
export async function updateUserSubscription(
  subscription: Stripe.Subscription | Stripe.Checkout.Session
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  // Determine subscription status safely
  const status = 'status' in subscription ? subscription.status : null;

  if (!status) {
    console.error('⚠️ Subscription status is missing or invalid.');
    return;
  }

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
      subscriptionId,
      subscriptionStatus: status,
    },
  });

  console.log(`✅ Updated subscription for ${user.email}: ${status}`);
}

/**
 * Returns true if the user has an active Stripe subscription.
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  return user?.subscriptionStatus === 'active';
}
