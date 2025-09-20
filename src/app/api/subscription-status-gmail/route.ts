// src/app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isStripeActive } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_AGE_SEC = 300; // 5 minutes

function verify(email: string, ts: string, sig: string): boolean {
  const secret = process.env.ER_SHARED_SECRET;
  if (!secret) return false;

  const tsNum = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;

  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > MAX_AGE_SEC) return false;

  // HMAC(email|ts) in hex, compare in constant time
  const expectedHex = crypto.createHmac("sha256", secret).update(`${email}|${ts}`).digest("hex");

  let a: Buffer, b: Buffer;
  try {
    a = Buffer.from(expectedHex, "hex");
    b = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;

  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, ts, sig } = await req.json();

    if (!email || !ts || !sig || !verify(email, ts, sig)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const active = await isStripeActive(email);
    return NextResponse.json({ active });
  } catch (err) {
    console.error("subscription-status-gmail error:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
