import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus?: string;
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
}

/**
 * Check if a user has an active Stripe subscription
 */
export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    if (!userId) {
      console.warn('checkSubscriptionStatus: No userId provided');
      return { hasActiveSubscription: false };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      return { hasActiveSubscription: false };
    }

    const isActive =
      user.subscriptionStatus === 'active' &&
      (!user.subscriptionEndDate || user.subscriptionEndDate > new Date());

    return {
      hasActiveSubscription: isActive,
      subscriptionStatus: user.subscriptionStatus || undefined,
      subscriptionEndDate: user.subscriptionEndDate || undefined,
      stripeCustomerId: user.stripeCustomerId || undefined,
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { hasActiveSubscription: false };
  }
}

/**
 * ✅ Real Stripe API check – double verify if a Stripe customer has an active subscription
 */
export async function verifyStripeSubscription(stripeCustomerId: string): Promise<boolean> {
  try {
    if (!stripeCustomerId) {
      return false;
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data.length > 0;
  } catch (error) {
    console.error('Error verifying Stripe subscription:', error);
    return false;
  }
}

/**
 * Create or update user subscription information in the database
 */
export async function updateUserSubscription(
  userId: string,
  stripeCustomerId: string,
  subscriptionId: string,
  subscriptionStatus: string,
  subscriptionEndDate: Date
) {
  try {
    if (!userId || !stripeCustomerId || !subscriptionId) {
      throw new Error('Missing required parameters for updateUserSubscription');
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        stripeCustomerId,
        subscriptionId,
        subscriptionStatus,
        subscriptionEndDate,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        email: `user-${userId}@example.com`, // Replace with your actual auth email
        stripeCustomerId,
        subscriptionId,
        subscriptionStatus,
        subscriptionEndDate,
      },
    });

    console.log(`Updated subscription for user ${userId}: ${subscriptionStatus}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}
