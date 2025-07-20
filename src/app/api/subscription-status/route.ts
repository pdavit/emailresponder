import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const subscriptionStatus = await checkSubscriptionStatus(userId);

    return NextResponse.json({
      hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
      subscriptionStatus: subscriptionStatus.subscriptionStatus,
      subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
    });

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
} 