// app/api/subscription-status-gmail/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isStripeActive } from "@/lib/subscription";

export const runtime = "nodejs"; // <-- add this

function verify(email: string, ts: string, sig: string) {
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (Number.isNaN(age) || age > 300) return false; // 5 minutes

  const h = crypto.createHmac("sha256", process.env.ER_SHARED_SECRET!);
  h.update(`${email}|${ts}`);
  const expected = h.digest("hex");

  try {
    // compare as hex bytes (safer than utf8 string bytes)
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(sig, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { email, ts, sig } = await req.json().catch(() => ({}));
  if (!email || !ts || !sig || !verify(String(email).toLowerCase().trim(), String(ts), String(sig))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const active = await isStripeActive(String(email));
  return NextResponse.json({ active });
}
