// src/app/api/history/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { history } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TEMP auth — read userId from query string until Firebase Admin is wired in
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const numericId = Number(params.id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await db
      .delete(history)
      .where(and(eq(history.id, numericId), eq(history.userId, userId)))
      .returning({ id: history.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "History item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error deleting history item:", err);
    return NextResponse.json(
      { error: "Failed to delete history item" },
      { status: 500 }
    );
  }
}
