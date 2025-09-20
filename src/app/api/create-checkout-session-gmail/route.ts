import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

function verify(email: string, ts: string, sig: string) {
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (age > 300) return false; // 5 minutes
  const h = crypto.createHmac("sha256", process.env.ER_SHARED_SECRET!);
  h.update(`${email}|${ts}`);
  const expected = h.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Create (or reuse) a Stripe customer for this email
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length) customerId = customers.data[0].id;
    else {
      const c = await stripe.customers.create({ email, metadata: { gmailEmail: email } });
      customerId = c.id;
    }

    // Send them to subscription checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      allow_promotion_codes: true,

      // land on thank-you, then auto-redirect back to the app
      success_url: `${process.env.APP_ORIGIN}/thank-you?redirect=/emailresponder`,
      cancel_url:  `${process.env.APP_ORIGIN}/emailresponder?checkout=cancelled`,
      client_reference_id: `gmail:${email}`,
      metadata: { gmailEmail: email },
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Internal error",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
