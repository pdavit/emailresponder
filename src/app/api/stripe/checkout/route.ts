import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

function getBaseUrl(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const { userId, email, redirect = "/emailresponder" } = await req.json();
  const price = process.env.STRIPE_PRICE_ID!;
  const baseUrl = getBaseUrl(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      client_reference_id: userId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(redirect)}`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] error", err);
    return NextResponse.json(
      { error: err?.message ?? "stripe_connection_failed" },
      { status: 500 }
    );
  }
}
