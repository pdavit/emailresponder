import { NextResponse } from 'next/server';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function GET() {
  try {
    // For demo purposes, we'll use a mock user ID
    // In a real app, you'd get this from your auth system (e.g., session, JWT, etc.)
    const mockUserId = 'demo-user-id';
    
    const subscriptionStatus = await checkSubscriptionStatus(mockUserId);

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