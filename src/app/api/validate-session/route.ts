// app/api/validate-session/route.ts

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
    const { userId } = auth();

    if (!session_id || !userId) {
      return new NextResponse(JSON.stringify({ error: "Missing session_id or unauthenticated" }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || typeof session.customer !== "string" || typeof session.subscription !== "string") {
      return new NextResponse(JSON.stringify({ error: "Invalid session" }), { status: 400 });
    }

    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const subscriptionStatus = subscription.status;

    // Upsert user record in the DB
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (existingUser) {
      await db
        .update(users)
        .set({
          stripeCustomerId,
          subscriptionId: stripeSubscriptionId,
          subscriptionStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      await db.insert(users).values({
        id: userId,
        email: session.customer_details?.email ?? "",
        stripeCustomerId,
        subscriptionId: stripeSubscriptionId,
        subscriptionStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Stripe session validation error:", err);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
