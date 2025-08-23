"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

type BillingStatus = {
  active: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
  priceId: string | null;
} | null;

export default function PricingPage() {
  const [user, setUser] = useState<Pick<User, "uid" | "email"> | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [status, setStatus] = useState<BillingStatus>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [upgrading, setUpgrading] = useState(false);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, email: u.email ?? null } : null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch subscription status once we know the email
  useEffect(() => {
    if (!user?.email) {
      setStatus(null);
      setStatusError(null);
      return;
    }
    setStatusLoading(true);
    setStatusError(null);

    fetch(`/api/billing/status?email=${encodeURIComponent(user.email)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load status");
        setStatus(data as BillingStatus);
      })
      .catch((e) => setStatusError(e.message || "Failed to load status"))
      .finally(() => setStatusLoading(false));
  }, [user?.email]);

  const subscribed = useMemo(() => !!status?.active, [status]);

  async function handleUpgrade() {
    if (!user?.uid || !user.email) {
      alert("You must be signed in to subscribe.");
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");
      window.location.assign(data.url);
    } catch (e: any) {
      alert(e.message || "Stripe checkout failed. Please try again.");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    if (!user?.email) {
      alert("You must be signed in to manage billing.");
      return;
    }
    setManaging(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to open portal");
      window.location.assign(data.url);
    } catch (e: any) {
      alert(e.message || "Could not open billing portal. Please try again.");
    } finally {
      setManaging(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="mb-2 text-center text-3xl font-bold text-gray-900">
          EmailResponder Pro
        </h2>
        <p className="mb-2 text-center text-gray-600">
          Subscribe for just <span className="font-semibold">$7.99/month</span>
        </p>
        <p className="mb-6 text-center text-sm text-gray-500">
          Includes a 7-day free trial
        </p>

        {/* Status line for signed-in users */}
        {user && (
          <div className="mb-4 text-center text-sm">
            {statusLoading ? (
              <span className="text-gray-500">Checking subscription…</span>
            ) : statusError ? (
              <span className="text-red-600">{statusError}</span>
            ) : subscribed ? (
              <span className="text-green-700">
                You’re subscribed ({status?.status})
              </span>
            ) : (
              <span className="text-amber-700">No active subscription</span>
            )}
          </div>
        )}

        {/* Actions */}
        {user ? (
          <div className="space-y-3">
            {!subscribed && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading || statusLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {upgrading ? "Processing…" : "Upgrade Now"}
              </button>
            )}

            <button
              onClick={handleManageBilling}
              disabled={managing}
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-lg font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {managing ? "Loading…" : "Manage Billing"}
            </button>

            {subscribed && (
              <Link
                href="/emailresponder"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Go to App
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-3 text-lg font-semibold text-white opacity-70"
              title="You must be signed in to subscribe"
            >
              Sign in to Subscribe
            </button>
            <Link
              href="/sign-in"
              className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-lg font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <p className="mb-2 text-center">What’s included:</p>
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

/** Minimal type for the local user */
type User = {
  uid: string;
  email: string | null;
};
