import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Missing STRIPE_SECRET_KEY");

// No apiVersion override — uses your Dashboard version
const stripe = new Stripe(key, {
  maxNetworkRetries: 2,   // set to 0 while debugging if you want instant failures
  timeout: 20000,         // a little more headroom than 15s
  appInfo: { name: "EmailResponder", version: "1.0.0" }, // optional; shows in Stripe logs
});

export default stripe;
