"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpgrade = async () => {
    if (!user?.uid || !user?.email) {
      alert("You must be signed in to upgrade");
      return;
    }

    setIsUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, email: user.email }),
      });
      const { url, error } = await res.json();
      if (error) {
        alert(error);
      } else {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user?.email) {
      alert("You must be signed in to manage billing");
      return;
    }

    setIsManagingBilling(true);
    try {
      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const { url, error } = await r.json();
      if (error) {
        alert(error);
      } else {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setIsManagingBilling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          EmailResponder Pro
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Subscribe for just <span className="font-semibold">$7.99/month</span>
        </p>
        <p className="text-sm text-gray-500 text-center mb-6">
          Includes 7-day free trial
        </p>

        {user ? (
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              {isUpgrading ? "Processing..." : "Upgrade Now"}
            </button>
            
            <button
              onClick={handleManageBilling}
              disabled={isManagingBilling}
              className="block w-full text-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              {isManagingBilling ? "Loading..." : "Manage Billing"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              disabled
              className="block w-full text-center bg-gray-400 text-white py-3 rounded-lg font-semibold text-lg cursor-not-allowed opacity-60"
              title="You must be signed in to subscribe"
            >
              Sign in to Subscribe
            </button>
            
            <a
              href="/sign-in"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Sign In
            </a>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p className="text-center mb-2">What's included:</p>
          <ul className="space-y-1">
            <li>• Unlimited email replies</li>
            <li>• Advanced AI models</li>
            <li>• Priority support</li>
            <li>• Export functionality</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
