import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  try {
  const { userId } = await auth();


    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.stripeCustomerId) {
      return new NextResponse(JSON.stringify({ error: "User or Stripe customer not found" }), {
        status: 404,
      });
    }

   const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'subscription',
  line_items: [
    {
      price: process.env.STRIPE_PRICE_ID!,
      quantity: 1,
    },
  ],
  metadata: {
    userId,
  },
  subscription_data: {
    metadata: {
      userId,
    },
  },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/emailresponder?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
  customer: user.stripeCustomerId,
});

    return new NextResponse(JSON.stringify({ url: session.url }));
  } catch (err) {
    console.error("❌ Error creating Stripe checkout session:", err);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
