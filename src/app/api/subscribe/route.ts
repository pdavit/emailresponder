import { NextRequest, NextResponse } from 'next/server';
import { updateUserSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { planId, userId } = await request.json();

    // Validate required fields
    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, userId' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Create a Stripe checkout session
    // 2. Return the session URL for redirect
    // 3. Handle webhook for successful payment
    
    // For demo purposes, we'll simulate a successful subscription
    const mockStripeCustomerId = `cus_${Math.random().toString(36).substr(2, 9)}`;
    const mockSubscriptionId = `sub_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set subscription end date to 1 month from now
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    // Update user subscription in database
   await updateUserSubscription(userId, {
  stripeCustomerId: mockStripeCustomerId,
  stripeSubscriptionId: mockSubscriptionId,
  stripePriceId: 'price_mock_id', // Use your real or mocked price_id
  stripeCurrentPeriodEnd: Math.floor(subscriptionEndDate.getTime() / 1000),
});

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      subscriptionId: mockSubscriptionId,
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// GET endpoint to check subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Import here to avoid circular dependency
    const { checkSubscriptionStatus } = await import('@/lib/subscription');
    const subscriptionStatus = await checkSubscriptionStatus(userId);

    return NextResponse.json(subscriptionStatus);

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
} 