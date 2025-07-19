import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

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

    const existingRecord = await prisma.history.findUnique({
      where: { 
        id: parsedId,
        userId: mockUserId, // Only allow deletion of user's own records
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    await prisma.history.delete({ where: { id: parsedId } });

    return NextResponse.json({ message: 'History record deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting history record:', error);
    return NextResponse.json({ error: 'Failed to delete history record' }, { status: 500 });
  }
}
