"use client";

import { useState } from "react";

export default function PricingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          EmailResponder v2
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Subscribe for just <span className="font-semibold">$4.99/month</span>
        </p>

        <button
          disabled
          className="block w-full text-center bg-gray-400 text-white py-3 rounded-lg font-semibold text-lg cursor-not-allowed opacity-60"
          title="Payments temporarily unavailable - coming soon!"
        >
          Subscribe Now – $4.99/month
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Payments temporarily unavailable. Coming soon!
        </p>
      </div>
    </div>
  );
}
