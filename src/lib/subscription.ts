// src/lib/subscription.ts
import { adminDb } from "@/lib/firebase-admin";

/** Shape we store under users/{uid}.billing (keep this loose to avoid TS churn). */
type Billing = {
  active?: boolean;
  status?: string | null;
  currentPeriodEnd?: number | null; // seconds since epoch (optional)
  subscriptionId?: string | null;
  priceId?: string | null;
  customerId?: string | null;
  updatedAt?: unknown;
};

type UserDoc = {
  email?: string | null;
  billing?: Billing;
};

/** Normalize an email for lookups. */
function norm(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Fetch users/{uid} by email. We first query the "users" collection by `email`.
 * If you also maintain a mapping doc at email_to_uid/{email} -> {uid}, we'll
 * fall back to that as well.
 */
async function getUserDocByEmail(email: string) {
  const emailKey = norm(email);
  if (!emailKey) return null;

  // Primary: users collection has `email` field.
  const q = await adminDb
    .collection("users")
    .where("email", "==", emailKey)
    .limit(1)
    .get();

  if (!q.empty) return q.docs[0];

  // Optional fallback: mapping doc email_to_uid/{email} -> { uid }
  try {
    const mapSnap = await adminDb.collection("email_to_uid").doc(emailKey).get();
    const uid = mapSnap.exists ? (mapSnap.data()?.uid as string | undefined) : undefined;
    if (uid) {
      const byUid = await adminDb.collection("users").doc(uid).get();
      if (byUid.exists) return byUid;
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Business rule: active if status is 'active' or 'trialing', or explicit active flag. */
function computeActive(billing?: Billing): boolean {
  if (!billing) return false;
  if (billing.active === true) return true;

  const s = (billing.status ?? "").toString().toLowerCase();
  return s === "active" || s === "trialing";
}

/**
 * Return whether this email currently has an active (or trialing) subscription.
 * No caching — reads Firestore live so immediate cancellations are respected.
 */
export async function isStripeActive(email: string): Promise<boolean> {
  const doc = await getUserDocByEmail(email);
  if (!doc || !doc.exists) return false;

  const data = (doc.data() as UserDoc) ?? {};
  return computeActive(data.billing);
}
