// Server-side Firestore (Admin SDK)
import { cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  // Prefer GOOGLE_APPLICATION_CREDENTIALS env, otherwise raw JSON in env
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")!;

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    } as ServiceAccount),
  });
}

export const db = getFirestore();
