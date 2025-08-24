import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Optional: keep consistent with your Stripe dashboard default
  apiVersion: "2025-06-30.basil",
});

export default stripe;
