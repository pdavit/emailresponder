import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(key, {
  // Do NOT hardcode apiVersion; let Stripe use your dashboard’s version
  httpClient: Stripe.createNodeHttpClient(), // ensure Node http client
  timeout: 15000,
  maxNetworkRetries: 0,
});

export default stripe;
