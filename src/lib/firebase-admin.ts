// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Fix escaped newlines and stray quotes from env UI
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
}

const app =
  getApps()[0] ||
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export default app;
