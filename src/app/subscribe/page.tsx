"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url; // ✅ Redirect to live Stripe Checkout session
      } else {
        alert("Something went wrong. No URL returned.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Checkout failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Subscribe</h1>
        <p className="text-gray-600 mb-6">Choose a plan to unlock all features!</p>
        <button
          onClick={handleSubscribe}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Subscribe with Stripe"}
        </button>
        <p className="text-xs text-gray-400 mt-4">Secure checkout via Stripe. Cancel anytime.</p>
      </div>
    </div>
  );
}
