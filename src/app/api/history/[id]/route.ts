import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { history } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/history/:id?userId=UID
export async function DELETE(req: Request, ctx: any) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const idStr = ctx?.params?.id;
  const idNum = Number(idStr);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const deleted = await db
    .delete(history)
    .where(and(eq(history.id, idNum), eq(history.userId, userId)))
    .returning({ id: history.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "History item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
