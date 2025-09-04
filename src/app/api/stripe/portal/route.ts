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
  const { email } = await req.json();
  const baseUrl = getBaseUrl(req);

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return NextResponse.json({ error: "no_customer" }, { status: 404 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${baseUrl}/emailresponder`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error("[portal] error", err);
    return NextResponse.json({ error: "stripe_connection_failed" }, { status: 500 });
  }
}

