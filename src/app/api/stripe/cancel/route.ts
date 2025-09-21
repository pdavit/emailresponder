import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Convert a Gmail permalink (even print view) into the normal Gmail UI URL. */
function toGmailUiUrl(back: string): string | null {
  try {
    const u = new URL(back);
    if (u.hostname !== "mail.google.com") return null;

    const authuser = u.searchParams.get("authuser") || "";
    const threadId = u.searchParams.get("th"); // present on print/permalink links

    // If the hash already points to UI (#inbox/#all), keep it.
    if (u.hash && /#(inbox|all)\//.test(u.hash)) {
      return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}${u.hash}`;
    }

    // Otherwise build a canonical UI URL with the thread id if we have it.
    if (threadId) {
      return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}#all/${threadId}`;
    }

    // Fallback: user’s inbox UI
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

  // Last resort: just land in Gmail
  return NextResponse.redirect("https://mail.google.com/mail/", { status: 302 });
}
