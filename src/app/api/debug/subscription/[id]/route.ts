// src/app/api/debug/subscription/[id]/route.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = params.id;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      stripeCustomerId: user.stripeCustomerId,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
      stripePriceId: user.stripePriceId,
    });
  } catch (err) {
    console.error("🛠️ Error fetching user subscription:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
