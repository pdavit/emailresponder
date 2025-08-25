import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { history } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/history?userId=UID
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([], { status: 200 });

  const rows = await db
    .select()
    .from(history)
    .where(eq(history.userId, userId))
    .orderBy(desc(history.createdAt));

  return NextResponse.json(rows);
}

// DELETE /api/history?userId=UID  -> delete all user's history
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const deleted = await db
    .delete(history)
    .where(eq(history.userId, userId))
    .returning({ id: history.id });

  return NextResponse.json({ deletedCount: deleted.length });
}
