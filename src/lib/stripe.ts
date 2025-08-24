import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Missing STRIPE_SECRET_KEY");

// Use the fetch-based client that plays nicest with Vercel’s runtime.
// Also give it some retry/timeout headroom for transient network hiccups.
const stripe = new Stripe(key, {
  httpClient: Stripe.createFetchHttpClient(),
  maxNetworkRetries: 2,
  timeout: 20000,
  // Do NOT pin apiVersion here; let your dashboard version apply.
});

export default stripe;
