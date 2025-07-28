// app/api/subscription-status/route.ts
import { auth } from "@clerk/nextjs";
import { checkSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = auth();

  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const isActive = await checkSubscriptionStatus(userId);

  return NextResponse.json({ hasActiveSubscription: isActive }); // ✅ fixed key name
}