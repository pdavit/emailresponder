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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up user
    let user = await db.query.users.findFirst({ where: eq(users.id, userId) });

    // If no stripe customer yet, create one and persist it
    if (!user?.stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
      });

      if (user) {
        await db
          .update(users)
          .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
          .where(eq(users.id, userId));
      } else {
        await db.insert(users).values({
          id: userId,
          email: "", // fill if you have it
          stripeCustomerId: customer.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // ✅ re-fetch instead of spreading a maybe-undefined value
      user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    }

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Failed to create Stripe customer" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // automatic payment methods are enabled by default on modern accounts;
      // omit payment_method_types unless you need to restrict them.
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],

      // Keep user linkage everywhere
      metadata: { userId },
      subscription_data: { metadata: { userId } },

      client_reference_id: userId,
      customer: user.stripeCustomerId,

      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/emailresponder?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creating Stripe checkout session:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
