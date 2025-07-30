import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
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

    const deleted = await db
      .delete(history)
      .where(and(eq(history.id, id)))
      .returning();

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    return NextResponse.json(
      { error: 'Something went wrong', details: (err as Error).message },
      { status: 500 }
    );
  }
}
