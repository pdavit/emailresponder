// app/api/stripe/success/route.ts
import { NextRequest, NextResponse } from "next/server";

function isGmail(url: string) {
  try { return new URL(url).origin === "https://mail.google.com"; }
  catch { return false; }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let back = url.searchParams.get("back") || "";
  const u   = url.searchParams.get("u") || ""; // gmail address

  if (back && isGmail(back)) {
    // Normalize the Gmail link to the modern UI + enforce authuser
    try {
      const parsed = new URL(back);

      // If it's the old /mail/u/0/?source=sync&view=pt… style, rewrite to /mail/?authuser=…
      if (/^\/mail\/u\/\d+\//.test(parsed.pathname) || parsed.searchParams.get("view") === "pt") {
        const q = parsed.search;   // keep existing Gmail params
        const h = parsed.hash;     // keep hash if any
        const auth = u ? `authuser=${encodeURIComponent(u)}` : "";
        const sep = q.includes("?") ? "&" : (q ? "&" : "?");
        const rebuilt = `https://mail.google.com/mail/?${auth}${auth && q ? "&" : ""}${q.replace(/^\?/, "")}${h}`;
        return NextResponse.redirect(rebuilt, { status: 302 });
      }

      // Else ensure authuser is present
      if (u && !parsed.searchParams.has("authuser")) {
        parsed.searchParams.set("authuser", u);
        back = parsed.toString();
      }
    } catch { /* fall through to basic fallback */ }

    return NextResponse.redirect(back, { status: 302 });
  }

  // No safe Gmail URL — simple “close this tab” fallback
  return new NextResponse(
    `<!doctype html><meta charset="utf-8">
     <title>Success</title>
     <p>Subscription active. You can close this tab and return to Gmail.</p>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
