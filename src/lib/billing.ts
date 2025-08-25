import { db } from "@/lib/firestore";

export async function linkCustomerToUser(firebaseUid: string, customerId: string, email?: string) {
  const ref = db.collection("users").doc(firebaseUid);
  await ref.set(
    {
      email,
      stripeCustomerId: customerId,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function setSubscriptionStatus(
  firebaseUid: string,
  sub: {
    id?: string;
    status?: string;
    priceId?: string | null;
    currentPeriodEnd?: number | null;
  }
) {
  const ref = db.collection("users").doc(firebaseUid);
  await ref.set(
    {
      subscription: {
        id: sub.id,
        status: sub.status,
        priceId: sub.priceId ?? undefined,
        currentPeriodEnd: sub.currentPeriodEnd ?? undefined,
      },
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
