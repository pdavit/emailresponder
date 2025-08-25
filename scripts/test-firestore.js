// scripts/test-firestore.js
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

function init() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getFirestore();
}

async function main() {
  const db = init();
  const id = "diagnostic-" + Date.now();
  await db.collection("diagnostics").doc(id).set({
    ok: true,
    at: new Date().toISOString(),
    note: "EmailResponder Firestore test",
  });
  const snap = await db.collection("diagnostics").doc(id).get();
  console.log("Read back:", snap.data());
}

main().catch((e) => (console.error(e), process.exit(1)));
