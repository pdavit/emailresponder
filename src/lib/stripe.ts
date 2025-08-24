// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Helpful log on cold starts if key is missing
  console.warn("[stripe] STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
// (Optionally pin a version if you like)
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2025-06-30.basil" });

export default stripe;
