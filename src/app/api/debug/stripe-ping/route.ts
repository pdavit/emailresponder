import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await stripe.prices.list({ limit: 1 });
    return NextResponse.json({ ok: true, count: prices.data.length });
  } catch (e: any) {
    // Surface the raw Stripe error so we can see exactly what's happening in Vercel logs
    return NextResponse.json(
      { ok: false, type: e?.type, code: e?.code ?? null, message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
