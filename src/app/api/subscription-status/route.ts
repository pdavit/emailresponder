// app/api/subscription-status/route.ts
import { auth } from "@clerk/nextjs/server";
import { checkSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = auth();

  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const isActive = await checkSubscriptionStatus(userId);

  return NextResponse.json({ hasActiveSubscription: isActive }); // ✅ fixed key name
}