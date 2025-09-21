import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ✅ Real regex literal (no quotes)
function isSafeGmailUrl(url: string) {
  try {
    return new URL(url).origin === "https://mail.google.com";
  } catch {
    return false;
  }
}
export async function GET(req: NextRequest) {
  const back = new URL(req.url).searchParams.get("back") || "";

  // If we have a safe Gmail URL, send them straight back to that thread
  if (back && isSafeGmailUrl(back)) {
    return NextResponse.redirect(back, { status: 302 });
  }

  // Fallback: tiny HTML telling the user to close the tab and return to Gmail
  return new NextResponse(
    `<!doctype html><meta charset="utf-8">
     <title>Checkout canceled</title>
     <p>Checkout canceled. You can close this tab and return to Gmail.</p>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
