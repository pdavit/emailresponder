"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = () => {
  setLoading(true);
  window.location.href = "https://buy.stripe.com/test_28E5kD6EFbEwgeA8ng2B201";
};
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Subscribe</h1>
        <p className="text-gray-600 mb-6">Choose a plan to unlock all features!</p>
        <button
          onClick={handleSubscribe}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Subscribe with Stripe"}
        </button>
      </div>
    </div>
  );
}
