// src/lib/subscription.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

// Consider these states as "has access"
const VALID_STATUSES = new Set(["trialing", "active"]);

export async function isStripeActive(email: string): Promise<boolean> {
  // 1) Find (or infer) a Stripe customer by email
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) return false;

  // 2) Get the latest subscription for that customer
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 1,
    expand: ["data.latest_invoice.payment_intent"],
  });
  const sub = subs.data[0];
  if (!sub) return false;

  // 3) Allow while trialing or active (optionally include past_due if you want)
  return VALID_STATUSES.has(sub.status);
}
