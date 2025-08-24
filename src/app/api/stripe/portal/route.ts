import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // avoid caching any errors

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const list = await stripe.customers.list({ email, limit: 1 });
    const customer = list.data[0];
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error("portal error", err);
    return NextResponse.json({ error: err?.message ?? "Portal error" }, { status: 500 });
  }
}
