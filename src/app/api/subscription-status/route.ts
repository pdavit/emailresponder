// src/app/api/subscription-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isStripeActive } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const active = await isStripeActive(email);
  return NextResponse.json({ active }, { status: 200 });
}
