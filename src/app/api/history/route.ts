import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSubscriptionStatus } from '@/lib/subscription';

// GET handler - returns all History records sorted by createdAt DESC
export async function GET() {
  try {
    // Check subscription status first
    const mockUserId = 'demo-user-id'; // In real app, get from auth
    const subscriptionStatus = await checkSubscriptionStatus(mockUserId);
    
    if (!subscriptionStatus.hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    const history = await prisma.history.findMany({
      where: {
        userId: mockUserId, // Only show user's own history
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

// DELETE handler - deletes all records in the History table
export async function DELETE() {
  try {
    // Check subscription status first
    const mockUserId = 'demo-user-id'; // In real app, get from auth
    const subscriptionStatus = await checkSubscriptionStatus(mockUserId);
    
    if (!subscriptionStatus.hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    await prisma.history.deleteMany({
      where: {
        userId: mockUserId, // Only delete user's own history
      },
    });
    
    return NextResponse.json(
      { message: 'All history records deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting history:', error);
    return NextResponse.json(
      { error: 'Failed to delete history' },
      { status: 500 }
    );
  }
} 