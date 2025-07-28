import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_LIVE_PRICE_ID!, // ✅ Using live price
          quantity: 1,
        },
      ],
      customer_email: user.email || undefined,
      metadata: { userId: user.id },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    // ✅ Save the Stripe customer ID for future webhook lookups
    if (session.customer && typeof session.customer === "string") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: session.customer,
        },
      });

      console.log("✅ Stored stripeCustomerId for user:", session.customer);
    } else {
      console.warn("⚠️ Session created without a customer ID");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("❌ Checkout session error:", error);
    return new NextResponse(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
}
