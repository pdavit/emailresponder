import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isSafeGmailUrl(url: string) {
  return /^https:\/\/mail\.google\.com\//.test(url);
}

export async function GET(req: NextRequest) {
  const origin = (process.env.APP_ORIGIN ?? "").trim();
  const back = new URL(req.url).searchParams.get("back") || "";

  // Prefer jumping straight back to the Gmail thread that started checkout.
  if (back && isSafeGmailUrl(back)) {
    return NextResponse.redirect(back, { status: 302 });
  }

  // Fallback: land in the app with a “success” hint.
  return NextResponse.redirect(`${origin}/emailresponder?checkout=success`, {
    status: 302,
  });
}
