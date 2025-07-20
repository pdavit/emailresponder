import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateUserSubscription } from '@/lib/subscription';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create a demo subscription for the authenticated user
    const mockStripeCustomerId = 'cus_demo123456';
    const mockSubscriptionId = 'sub_demo123456';
    
    // Set subscription end date to 1 year from now
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

    await updateUserSubscription(
      userId,
      mockStripeCustomerId,
      mockSubscriptionId,
      'active',
      subscriptionEndDate
    );

    return NextResponse.json({
      success: true,
      message: 'Demo subscription created successfully',
      userId: userId,
      subscriptionStatus: 'active',
      subscriptionEndDate: subscriptionEndDate.toISOString(),
    });

  } catch (error) {
    console.error('Error setting up demo subscription:', error);
    return NextResponse.json(
      { error: 'Failed to setup demo subscription' },
      { status: 500 }
    );
  }
} 