// src/lib/billing/subscriptionStatus.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** We count trialing or active as "allowed". */
const ALLOWED: Stripe.Subscription.Status[] = ["trialing", "active"];

/** Returns { active, status?, customerId?, subscriptionId?, priceId? } */
export async function getStripeSubscriptionStatusByEmail(emailRaw: string) {
  const email = (emailRaw || "").trim().toLowerCase();
  if (!email) return { active: false as const };

  // 1) Find customer(s) by email (there can be more than one)
  const customers = await stripe.customers.list({ email, limit: 10 });

  for (const c of customers.data) {
    // 2) List subs for each customer
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    });

    for (const s of subs.data) {
      if (ALLOWED.includes(s.status)) {
        const firstItem = s.items.data[0];
        return {
          active: true as const,
          status: s.status,
          customerId: c.id,
          subscriptionId: s.id,
          priceId: firstItem?.price?.id,
        };
      }
    }
  }

  return { active: false as const };
}
