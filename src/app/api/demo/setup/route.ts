import { NextRequest, NextResponse } from 'next/server';
import { updateUserSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    // Create a demo user with active subscription
    const demoUserId = 'demo-user-id';
    const mockStripeCustomerId = 'cus_demo123456';
    const mockSubscriptionId = 'sub_demo123456';
    
    // Set subscription end date to 1 year from now
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

    await updateUserSubscription(
      demoUserId,
      mockStripeCustomerId,
      mockSubscriptionId,
      'active',
      subscriptionEndDate
    );

    return NextResponse.json({
      success: true,
      message: 'Demo user created with active subscription',
      userId: demoUserId,
      subscriptionStatus: 'active',
      subscriptionEndDate: subscriptionEndDate.toISOString(),
    });

  } catch (error) {
    console.error('Error setting up demo user:', error);
    return NextResponse.json(
      { error: 'Failed to setup demo user' },
      { status: 500 }
    );
  }
} 