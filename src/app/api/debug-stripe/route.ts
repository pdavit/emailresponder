import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_GMAIL || process.env.STRIPE_PRICE_ID;

    if (!key) {
      return NextResponse.json({ ok: false, step: "env", error: "STRIPE_SECRET_KEY missing" }, { status: 500 });
    }

    const stripe = new Stripe(key);
    // Simple calls to prove connectivity and auth
    const balance = await stripe.balance.retrieve().catch((e) => { throw new Error("balance: " + e.message); });
    let price: Stripe.Response<Stripe.Price> | null = null;
    if (priceId) {
      price = await stripe.prices.retrieve(priceId).catch((e) => { throw new Error("price: " + e.message); });
    }

    return NextResponse.json({
      ok: true,
      account_mode: balance.livemode ? "live" : "test",
      price_found: !!price,
      price_id: price?.id ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, step: "stripe", error: err?.message || String(err) }, { status: 500 });
  }
}
