// src/lib/getUidFromRequest.ts
import { headers } from "next/headers";
import { adminAuth } from "./firebaseAdmin";

export async function getUidFromRequest(): Promise<string> {
  const h = await headers();
  const auth = h.get("authorization") || h.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing auth token");
  const idToken = auth.slice("Bearer ".length);
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}
