import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkSubscriptionStatus } from '@/lib/subscription';

interface Context {
  params: { id: string };
}

export async function DELETE(
  req: NextRequest,
  { params }: Context
) {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasActiveSubscription = await checkSubscriptionStatus(userId);
    if (!hasActiveSubscription) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
    }

    const record = await db
      .select()
      .from(history)
      .where(and(eq(history.id, id), eq(history.userId, userId)))
      .limit(1);

    if (!record.length) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    await db.delete(history).where(eq(history.id, id));

    return NextResponse.json({ message: 'History record deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('❌ Error deleting history record:', error);
    return NextResponse.json({ error: 'Failed to delete history record' }, { status: 500 });
  }
}
