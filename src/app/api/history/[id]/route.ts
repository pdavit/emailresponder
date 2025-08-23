import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get userId from query params (temporary solution)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { id } = await params;
    
    // Parse and validate the ID parameter
    const numericId = Number(id);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    console.log("DELETE /api/history/[id] - starting single delete:", { userId, id: numericId });

    // Delete the specific history item for the current user
    const deleted = await db
      .delete(history)
      .where(and(eq(history.id, numericId), eq(history.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      console.log("⚠️ DELETE /api/history/[id] - item not found:", { userId, id: numericId });
      return NextResponse.json({ error: 'History item not found' }, { status: 404 });
    }

    console.log("✅ DELETE /api/history/[id] completed successfully:", { userId, id: numericId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Error deleting history item:', error);
    return NextResponse.json(
      { error: 'Failed to delete history item' },
      { status: 500 }
    );
  }
}
