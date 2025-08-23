"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function RequireSubscription({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) return; // RequireAuth will handle unauthenticated.

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
      } catch (e) {
        console.error("sub check failed", e);
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
