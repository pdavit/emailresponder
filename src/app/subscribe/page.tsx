"use client";

import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = () => {
    setLoading(true);
    window.location.href = "https://buy.stripe.com/28E7sL9QR23W7I46f82B202"; // ✅ LIVE checkout URL
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Subscribe</h1>
        <p className="text-gray-600 mb-6">
          Choose a plan to unlock all features!
        </p>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Subscribe with Stripe"}
        </button>
        <p className="text-xs text-gray-400 mt-4">
          Secure checkout via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
