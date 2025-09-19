// app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isStripeActive } from "@/lib/subscription";

function verify(email: string, ts: string, sig: string) {
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (age > 300) return false; // 5 minutes
  const h = crypto.createHmac("sha256", process.env.ER_SHARED_SECRET!);
  h.update(`${email}|${ts}`);
  const expected = h.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { email, ts, sig } = await req.json();

  if (!email || !ts || !sig || !verify(email, ts, sig)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const active = await isStripeActive(email);
  return NextResponse.json({ active });
}
