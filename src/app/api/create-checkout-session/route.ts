// app/api/create-checkout-session/route.ts
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Look up user
    let user = await db.query.users.findFirst({ where: eq(users.id, userId) });

    // If no stripe customer yet, create one and persist it
    if (!user?.stripeCustomerId) {
      const customer = await stripe.customers.create({
        // fallbacks in case you don’t have email stored yet
        metadata: { userId },
      });

      if (user) {
        await db.update(users)
          .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
          .where(eq(users.id, userId));
        user = { ...user, stripeCustomerId: customer.id };
      } else {
        // in case the row doesn't exist yet
        await db.insert(users).values({
          id: userId,
          email: "", // fill if you have it
          stripeCustomerId: customer.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        user = { ...user, stripeCustomerId: customer.id } as typeof user;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],

      // ✅ ensure your webhook can link the sub back to the Clerk user
      metadata: { userId },
      subscription_data: { metadata: { userId } },

      client_reference_id: userId,
      customer: user!.stripeCustomerId!,

      // include session_id so you can validate client-side if you want
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/emailresponder?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creating Stripe checkout session:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
