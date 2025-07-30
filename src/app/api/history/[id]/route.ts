import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function DELETE(
  req: NextRequest,
  context: { params: Record<string, string> } // ✅ This is the safe universal type
) {
  const { id } = context.params;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId)) {
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

    const existing = await db
      .select()
      .from(history)
      .where(and(eq(history.id, parsedId), eq(history.userId, userId)))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    await db.delete(history).where(eq(history.id, parsedId));
    return NextResponse.json({ message: 'History record deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('❌ Failed to delete history:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
