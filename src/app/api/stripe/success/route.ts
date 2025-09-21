// src/app/api/stripe/success/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeGmailUrl(url: string) {
  return /^https:\/\/mail\.google\.com\//.test(url);
}

export async function GET(req: NextRequest) {
  const origin   = (process.env.APP_ORIGIN || "").trim() || "https://app.skyntco.com";
  const url      = new URL(req.url);
  const back     = (url.searchParams.get("back") || "").trim();
  const already  = url.searchParams.get("already"); // optional, harmless

  // If we have a safe Gmail link, send the user *back to Gmail*.
  if (back && isSafeGmailUrl(back)) {
    return NextResponse.redirect(back, { status: 303 });
  }

  // Fallback: send to your web app success page (keeps existing behavior when no back is available)
  const fallback = `${origin}/emailresponder?checkout=success${already ? "&already=1" : ""}`;
  return NextResponse.redirect(fallback, { status: 303 });
}
