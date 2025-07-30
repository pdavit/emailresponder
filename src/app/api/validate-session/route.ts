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
      return new NextResponse(JSON.stringify({ error: "Missing session_id or user not authenticated" }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || typeof session.customer !== "string") {
      return new NextResponse(JSON.stringify({ error: "Invalid session" }), { status: 400 });
    }

    const stripeCustomerId = session.customer;

    // Update user in Drizzle
    await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Stripe session validation error:", err);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
