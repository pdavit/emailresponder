// app/api/subscription-status/route.ts
import { auth } from "@clerk/nextjs/server";
import { checkSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isActive = await checkSubscriptionStatus(userId);

  return new NextResponse(JSON.stringify({ hasActiveSubscription: isActive }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET()  { return handle(); }
export async function POST() { return handle(); }
