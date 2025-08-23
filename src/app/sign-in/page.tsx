// app/sign-in/[[...sign-in]]/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default function SignInRedirect() {
  // Build the absolute callback back to your app
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app.skyntco.com";
  const origin = `${proto}://${host}`;

  const callback = encodeURIComponent(`${origin}/emailresponder`);
  redirect(`https://accounts.skyntco.com/sign-in?redirect_url=${callback}`);
}
