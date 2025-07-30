// src/app/api/history/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const { id } = await req.json();

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await db
      .delete(history)
      .where(eq(history.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to delete record', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
