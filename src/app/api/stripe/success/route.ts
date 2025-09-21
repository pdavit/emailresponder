// app/api/stripe/success/route.ts
import { NextRequest, NextResponse } from "next/server";

function isSafeGmailUrl(url: string) {
  try {
    return new URL(url).origin === "https://mail.google.com";
  } catch {
    return false;
  }
}export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const back = searchParams.get("back") || "";
  if (back && isSafeGmailUrl(back)) {
    return NextResponse.redirect(back, { status: 302 });
  }
  // Fallback: tiny HTML with a button back to Gmail if we didn’t get a safe URL
  return new NextResponse(
    `<!doctype html><meta charset="utf-8">
     <title>Success</title>
     <p>Subscription active. You can close this tab.</p>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
