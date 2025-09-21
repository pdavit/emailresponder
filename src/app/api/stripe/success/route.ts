// app/api/stripe/success/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Build a canonical Gmail UI URL from a Gmail permalink (even if it's view=pt). */
function toGmailUiUrl(back: string): string | null {
  try {
    const u = new URL(back);
    if (u.hostname !== "mail.google.com") return null;

    const authuser = u.searchParams.get("authuser") || "";
    const threadId = u.searchParams.get("th"); // present on print/permalink URLs

    // If there's already a UI hash like #inbox/<id> or #all/<id>, preserve it.
    if (u.hash && /#(inbox|all)\//.test(u.hash)) {
      return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}${u.hash}`;
    }

    // If we have the thread id from the querystring, build a canonical UI link.
    if (threadId) {
      // You can use "inbox" if you prefer; "all" is more resilient.
      return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}#all/${threadId}`;
    }

    // Fallback: just go to the user's inbox UI
    return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}#inbox`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const back = new URL(req.url).searchParams.get("back") || "";

  const ui = toGmailUiUrl(back);
  if (ui) {
    return NextResponse.redirect(ui, { status: 302 });
  }

  // Last resort: land on Gmail (no thread context)
  return NextResponse.redirect("https://mail.google.com/mail/", { status: 302 });
}
