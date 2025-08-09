// app/api/validate-session/route.ts
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
    const { userId } = await auth();

    if (!session_id || !userId) {
      return NextResponse.json(
        { error: "Missing session_id or unauthenticated" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (
      !session ||
      typeof session.customer !== "string" ||
      typeof session.subscription !== "string"
    ) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    // Upsert the customer mapping if missing
    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (existing) {
      if (!existing.stripeCustomerId || existing.stripeCustomerId !== stripeCustomerId) {
        await db
          .update(users)
          .set({ stripeCustomerId, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
    }

    // Optionally, fetch subscription and store status immediately
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    await db
      .update(users)
      .set({
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
        stripePriceId: sub.items.data[0]?.price.id ?? null,
        subscriptionEndDate:
          typeof (sub as any).current_period_end === "number"
            ? new Date((sub as any).current_period_end * 1000)
            : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      ok: true,
      customerId: stripeCustomerId,
      subscriptionId: sub.id,
      status: sub.status,
    });
  } catch (err) {
    console.error("validate-session error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
