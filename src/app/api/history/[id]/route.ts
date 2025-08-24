// src/app/api/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // don't cache API responses

// DELETE /api/history/:id  -> delete one history doc for the authenticated user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // --- Verify Firebase ID token ---
    const authz = req.headers.get("authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }
    const { uid } = await adminAuth.verifyIdToken(token);

    // --- Validate param ---
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // --- Delete only under users/{uid}/history/{id} ---
    const ref = adminDb.collection("users").doc(uid).collection("history").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "History item not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err?.code === "auth/argument-error" || err?.message?.includes("auth")
      ? 401
      : 500;
    return NextResponse.json(
      { error: "Failed to delete history item" },
      { status }
    );
  }
}
