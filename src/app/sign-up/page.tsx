// app/sign-up/[[...sign-up]]/page.tsx
import { redirect } from "next/navigation";

export default function SignUpRedirect() {
  const origin = "https://app.skyntco.com";
  const cb = encodeURIComponent(`${origin}/emailresponder`);
  redirect(`https://accounts.skyntco.com/sign-up?redirect_url=${cb}`);
}
