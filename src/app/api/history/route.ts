import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { checkSubscriptionStatus } from '@/lib/subscription';

// GET handler - returns all History records sorted by createdAt DESC
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const subscriptionStatus = await checkSubscriptionStatus(userId);
    if (!subscriptionStatus)
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });

    const userHistory = await db
      .select()
      .from(history)
      .where(eq(history.userId, userId))
      .orderBy(desc(history.createdAt));

    return NextResponse.json(userHistory);
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// DELETE handler - deletes all records in the History table
export async function DELETE() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const subscriptionStatus = await checkSubscriptionStatus(userId);
    if (!subscriptionStatus)
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });

    await db.delete(history).where(eq(history.userId, userId));

    return NextResponse.json({ message: 'All history records deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('❌ Error deleting history:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
