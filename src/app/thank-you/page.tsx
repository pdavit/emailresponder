"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ThankYouPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      router.replace("/pricing");
      return;
    }

    // ✅ Validate the session with our backend
    fetch("/api/validate-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Validation failed");
        console.log("✅ Subscription validated");
      })
      .catch((err) => {
        console.error("❌ Error validating session:", err);
        router.replace("/pricing");
      });

    const timer = setTimeout(() => {
      router.push("/app");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router, sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-green-600 mb-4">🎉 Thank You!</h1>
        <p className="text-lg text-gray-700 mb-6">
         Your subscription is confirmed. You&apos;re all set to use EmailResponder 🚀
        </p>
        <button
          onClick={() => router.push("/app")}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Go to App
        </button>
      </div>
    </div>
  );
}
