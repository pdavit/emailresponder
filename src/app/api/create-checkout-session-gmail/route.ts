import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

function verify(email: string, ts: string, sig: string) {
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;

  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (age < 0 || age > 300) return false; // 5 minutes

  const secret = (process.env.ER_SHARED_SECRET ?? "").trim();
  if (!secret) return false;

  const expectedHex = crypto.createHmac("sha256", secret).update(`${email}|${ts}`).digest("hex");

  // Compare as bytes, constant-time, equal-length
  let a: Buffer, b: Buffer;
  try {
    a = Buffer.from(expectedHex, "hex");
    b = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;

  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "";
    const ts    = searchParams.get("ts") || "";
    const sig   = searchParams.get("sig") || "";

    if (!email || !ts || !sig || !verify(email, ts, sig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sk = (process.env.STRIPE_SECRET_KEY ?? "").trim();
    const priceId = (process.env.STRIPE_PRICE_ID ?? "").trim();
    const origin = (process.env.APP_ORIGIN ?? "").trim();

    if (!sk || !priceId || !origin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const stripe = new Stripe(sk /* no apiVersion -> use library default */);

    // Reuse existing customer by email if present; otherwise create one.
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const c = await stripe.customers.create({
        email,
        metadata: { gmailEmail: email }, // lets your webhook identify Gmail-only purchases
      });
      customerId = c.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,

      // include session_id in case you want to display details on the thank-you page
      success_url: `${origin}/thank-you?redirect=%2Femailresponder&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/emailresponder?checkout=cancelled`,

      client_reference_id: `gmail:${email}`,
      metadata: { gmailEmail: email },
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
