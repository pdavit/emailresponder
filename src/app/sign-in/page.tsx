// app/sign-in/[[...sign-in]]/page.tsx
import { redirect } from "next/navigation";

export default function SignInRedirect() {
  const origin = "https://app.skyntco.com";
  const cb = encodeURIComponent(`${origin}/emailresponder`);
  redirect(`https://accounts.skyntco.com/sign-in?redirect_url=${cb}`);
}
