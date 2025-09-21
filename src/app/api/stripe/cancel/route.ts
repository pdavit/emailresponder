// app/api/stripe/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";

function isGmail(url: string) {
  try { return new URL(url).origin === "https://mail.google.com"; }
  catch { return false; }
}

export async function GET(req: NextRequest) {
  const url  = new URL(req.url);
  let back   = url.searchParams.get("back") || "";
  const u    = url.searchParams.get("u") || "";

  if (back && isGmail(back)) {
    try {
      const parsed = new URL(back);
      if (/^\/mail\/u\/\d+\//.test(parsed.pathname) || parsed.searchParams.get("view") === "pt") {
        const q = parsed.search;
        const h = parsed.hash;
        const auth = u ? `authuser=${encodeURIComponent(u)}` : "";
        const rebuilt = `https://mail.google.com/mail/?${auth}${auth && q ? "&" : ""}${q.replace(/^\?/, "")}${h}`;
        return NextResponse.redirect(rebuilt, { status: 302 });
      }
      if (u && !parsed.searchParams.has("authuser")) {
        parsed.searchParams.set("authuser", u);
        back = parsed.toString();
      }
    } catch { /* ignore */ }

    return NextResponse.redirect(back, { status: 302 });
  }

  return new NextResponse(
    `<!doctype html><meta charset="utf-8">
     <title>Checkout canceled</title>
     <p>Checkout canceled. You can close this tab and return to Gmail.</p>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
