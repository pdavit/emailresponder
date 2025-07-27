import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { checkSubscriptionStatus } from '@/lib/subscription';

// GET handler - returns all History records sorted by createdAt DESC
export async function GET() {
  try {
    // Check subscription status first
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
   if (!subscriptionStatus) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    const history = await prisma.history.findMany({
      where: {
        userId: userId, // Only show user's own history
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
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    if (!subscriptionStatus)  {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    await prisma.history.deleteMany({
      where: {
        userId: userId, // Only delete user's own history
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