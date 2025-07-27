"use client";

import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong. No URL returned.");
      }
    } catch (err) {
      console.error("Subscription error:", err);
      alert("Checkout failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          EmailResponder v2
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Subscribe for just <span className="font-semibold">$4.99/month</span>
        </p>

       <a
  href="https://buy.stripe.com/28E7sL9QR23W7I46f8"
  target="_blank"
  rel="noopener noreferrer"
  className="block text-center bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition"
>
  Subscribe Now – $4.99/month
</a>

        <p className="text-xs text-center text-gray-400 mt-4">
          Cancel anytime. Secure checkout via Stripe.
        </p>
      </div>
    </div>
  );
}
