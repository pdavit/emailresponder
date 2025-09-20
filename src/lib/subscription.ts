// src/lib/subscription.ts
import Stripe from "stripe";
import { db } from "@/lib/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // no apiVersion here so Vercel uses the account default
});

const CACHE_COLL = "gmailSubs"; // doc id = lowercased email

/**
 * Return true if the email has an active or trialing Stripe subscription.
 * 1) Check Firestore cache (gmailSubs/{email})
 * 2) Fallback: look up customers by email in Stripe and scan subscriptions
 * 3) Write back a small cache doc for next time
 */
export async function isStripeActive(email: string): Promise<boolean> {
  const key = email.trim().toLowerCase();
  const docRef = db.collection(CACHE_COLL).doc(key);

  // 1) Firestore cache first
  const snap = await docRef.get();
  if (snap.exists) {
    const sub = (snap.data()?.subscription ?? {}) as {
      status?: string;
      currentPeriodEnd?: number | null;
    };
    if (sub.status === "active" || sub.status === "trialing") {
      // optional freshness check
      if (!sub.currentPeriodEnd || sub.currentPeriodEnd * 1000 > Date.now() - 60_000) {
        return true;
      }
    }
  }

  // 2) Stripe lookup
  const customers = await stripe.customers.list({ email, limit: 10 });
  let activeSub: Stripe.Subscription | null = null;

  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 10,
    });
    activeSub = subs.data.find(s => s.status === "active" || s.status === "trialing") || null;
    if (activeSub) break;
  }

  // 3) Cache & return
  await docRef.set(
    {
      subscription: {
        id: activeSub?.id ?? null,
        status: activeSub?.status ?? null,
        priceId: activeSub?.items?.data?.[0]?.price?.id ?? null,
        currentPeriodEnd: activeSub?.current_period_end ?? null,
      },
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return !!activeSub;
}
