import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Convert any Gmail link into the normal UI URL. */
function toGmailUiUrl(back: string): string | null {
  try {
    const u = new URL(back);
    if (u.hostname !== "mail.google.com") return null;

    const authuser = u.searchParams.get("authuser") || "";
    const th = u.searchParams.get("th");      // thread id present on many links

    // If hash already points to UI, keep it.
    if (u.hash && /#(inbox|all)\//.test(u.hash)) {
      return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}${u.hash}`;
    }

    // Build canonical UI URL for the thread if we have the id.
    if (th) {
      return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}#all/${th}`;
    }

    // Fallback to user’s Inbox UI.
    return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}#inbox`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const back = new URL(req.url).searchParams.get("back") || "";
  const ui = toGmailUiUrl(back);
  if (ui) return NextResponse.redirect(ui, { status: 302 });
  return NextResponse.redirect("https://mail.google.com/mail/", { status: 302 });
}
