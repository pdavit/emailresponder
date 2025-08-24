"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ThankYouPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Only allow same-origin paths; fall back to /emailresponder
  const target = useMemo(() => {
    const raw = params?.get("redirect") || "/emailresponder";
    return raw.startsWith("/") ? raw : "/emailresponder";
  }, [params]);

  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    const to = setTimeout(() => router.replace(target), 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(to);
    };
  }, [router, target]);

  const goNow = () => router.replace(target);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-4xl font-bold text-green-600 mb-3">🎉 Thank you!</h1>
        <p className="text-gray-700 mb-2">
          Your subscription is active. Welcome to <span className="font-semibold">EmailResponder</span>!
        </p>
        <p className="text-sm text-gray-500 mb-8" aria-live="polite">
          Redirecting to the app in <span className="font-semibold">{seconds}s</span>…
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={goNow}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Go to EmailResponder
          </button>

          <button
            onClick={() => router.replace("/pricing")}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Manage Billing
          </button>
        </div>
      </div>
    </div>
  );
}
