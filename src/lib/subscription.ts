// src/lib/subscription.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  "trialing",
  "active",
  "past_due",   // optional: counts as active for gating
  "unpaid",     // optional: counts as active for gating
]);

export async function isStripeActive(email: string): Promise<boolean> {
  const addr = (email || "").trim().toLowerCase();
  if (!addr) return false;

  // Stripe can hold multiple customers for the same email; check them all.
  const customers = await stripe.customers.list({ email: addr, limit: 10 });
  if (!customers.data.length) return false;

  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all", // include trialing, past_due, etc.
      limit: 20,
    });
    if (subs.data.some((s) => ACTIVE_STATUSES.has(s.status))) {
      return true;
    }
  }
  return false;
}
