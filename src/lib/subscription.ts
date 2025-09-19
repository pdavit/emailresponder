// src/lib/subscription.ts
import Stripe from "stripe";

// reuse the same file; just append this
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function isStripeActive(emailRaw: string): Promise<boolean> {
  const email = (emailRaw || "").trim().toLowerCase();
  if (!email) return false;

  // There could be multiple customers with the same email.
  const customers = await stripe.customers.list({ email, limit: 10 });

  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 10,
    });
    for (const s of subs.data) {
      if (s.status === "trialing" || s.status === "active") return true;
    }
  }
  return false;
}
