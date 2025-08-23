// src/lib/stripe.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // or { apiVersion: Stripe.LatestApiVersion }
export default stripe;
