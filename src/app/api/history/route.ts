// src/app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin"; // see note below

// Helper: verify Firebase ID token and return the uid
async function requireUid(req: NextRequest): Promise<string> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) throw new Error("missing_token");

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// GET /api/history  -> list items for current user
export async function GET(req: NextRequest) {
  try {
    const uid = await requireUid(req);

    const snap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("history")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json(items);
  } catch (e: any) {
    const code = e?.message === "missing_token" ? 401 : 500;
    return NextResponse.json({ error: "Failed to load history" }, { status: code });
  }
}

// POST /api/history  -> add one item for current user
export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    const body = await req.json();

    const { subject, originalEmail, reply, language, tone } = body || {};
    if (!subject || !originalEmail || !reply) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const now = Date.now();
    const ref = await adminDb
      .collection("users")
      .doc(uid)
      .collection("history")
      .add({
        subject,
        originalEmail,
        reply,
        language: language || "English",
        tone: tone || "professional",
        createdAt: now,
      });

    return NextResponse.json({ id: ref.id });
  } catch (e: any) {
    const code = e?.message === "missing_token" ? 401 : 500;
    return NextResponse.json({ error: "Failed to save history" }, { status: code });
  }
}

// DELETE /api/history  -> delete ALL history for current user
export async function DELETE(req: NextRequest) {
  try {
    const uid = await requireUid(req);

    const col = adminDb.collection("users").doc(uid).collection("history");
    const snap = await col.limit(500).get();
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return NextResponse.json({ deletedCount: snap.size });
  } catch (e: any) {
    const code = e?.message === "missing_token" ? 401 : 500;
    return NextResponse.json({ error: "Failed to delete history" }, { status: code });
  }
}
