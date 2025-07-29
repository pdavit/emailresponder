// src/app/api/check-subscription/route.ts
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse(JSON.stringify({ hasActiveSubscription: false }), { status: 401 });
    }

    const result = await db
      .select({ subscriptionStatus: users.subscriptionStatus })
      .from(users)
      .where(eq(users.id, userId));

    const user = result[0];

    const isActive =
      user?.subscriptionStatus === "active" ||
      user?.subscriptionStatus === "trialing";

    return NextResponse.json({ hasActiveSubscription: isActive });
  } catch (error) {
    console.error("❌ Subscription check failed:", error);
    return new NextResponse(JSON.stringify({ hasActiveSubscription: false }), { status: 500 });
  }
}
