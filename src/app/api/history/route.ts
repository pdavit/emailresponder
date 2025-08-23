import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = "nodejs";

// GET handler - returns all History records sorted by createdAt DESC
export async function GET(request: NextRequest) {
  try {
    // Get userId from query params (temporary solution)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // TODO: Re-gate behind subscription after Stripe reintegration
    // For now, allow access to all authenticated users

    console.log('GET /api/history', { userId });

    const userHistory = await db
      .select()
      .from(history)
      .where(eq(history.userId, userId))
      .orderBy(desc(history.createdAt));

    console.log(`✅ Retrieved ${userHistory.length} history items for user ${userId}`);
    return NextResponse.json(userHistory);
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// DELETE handler - deletes all records in the History table for the current user
export async function DELETE(request: NextRequest) {
  try {
    // Get userId from query params (temporary solution)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // TODO: Re-gate behind subscription after Stripe reintegration
    // For now, allow access to all authenticated users

    console.log('DELETE /api/history - starting bulk delete for user:', userId);

    const deleted = await db.delete(history).where(eq(history.userId, userId)).returning();
    const deletedCount = deleted.length;

    console.log('✅ DELETE /api/history completed successfully:', { userId, deletedCount });

    return NextResponse.json({ ok: true, deletedCount }, { status: 200 });
  } catch (error) {
    console.error('❌ Error deleting history:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
