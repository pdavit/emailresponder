// File: src/pages/api/checkout.ts
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: "price_1Rm2GKErQ2xDMCCbVNGmK7wI", // ✅ Replace with your actual price ID
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: 7,
        },
        success_url: "https://app.skyntco.com/success",
        cancel_url: "https://app.skyntco.com/cancel",
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Something went wrong creating session" });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
