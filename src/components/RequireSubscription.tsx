// src/components/RequireSubscription.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RequireSubscription({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      try {
        const res = await fetch(
          `/api/billing/status?email=${encodeURIComponent(user.email)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!data.active) {
          router.replace(`/pricing?redirect=${encodeURIComponent(pathname)}`);
        } else {
          setChecking(false);
        }
      } catch {
        router.replace(`/pricing?redirect=${encodeURIComponent(pathname)}`);
      }
    });
    return () => unsub();
  }, [router, pathname]);

  if (checking) {
    return <div className="p-8 text-center text-gray-500">Checking subscription…</div>;
  }
  return <>{children}</>;
}
