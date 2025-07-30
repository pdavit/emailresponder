import { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequestContext } from 'next';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function DELETE(
  req: NextRequest,
  context: NextApiRequestContext // ✅ This is the golden ticket!
) {
  const id = parseInt(context.params.id, 10);

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

    const match = await db
      .select()
      .from(history)
      .where(and(eq(history.id, id), eq(history.userId, userId)))
      .limit(1);

    if (!match.length) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    await db.delete(history).where(eq(history.id, id));
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('❌ DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
