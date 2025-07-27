// src/app/api/check-subscription/route.ts
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse(JSON.stringify({ hasActiveSubscription: false }), { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
      },
    });

    const isActive =
      user?.stripeSubscriptionStatus === "active" ||
      user?.stripeSubscriptionStatus === "trialing";

    return NextResponse.json({ hasActiveSubscription: isActive });
  } catch (error) {
    console.error("❌ Subscription check failed:", error);
    return new NextResponse(JSON.stringify({ hasActiveSubscription: false }), { status: 500 });
  }
}
