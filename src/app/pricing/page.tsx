"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type UserLite = {
  uid: string;
  email: string | null;
};

type BillingStatus = {
  active: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
  priceId: string | null;
} | null;

function formatDateFromUnixMs(ms: number | null) {
  if (!ms) return null;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export default function PricingPage() {
  const [user, setUser] = useState<UserLite | null>(null);
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

  // Load subscription status once we know the email
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
      .catch((e: any) => setStatusError(e?.message || "Failed to load status"))
      .finally(() => setStatusLoading(false));
  }, [user?.email]);

  const subscribed = useMemo(() => !!status?.active, [status]);
  const renewsOn = useMemo(
    () => formatDateFromUnixMs(status?.currentPeriodEnd ?? null),
    [status?.currentPeriodEnd]
  );

  async function handleUpgrade() {
    if (!user?.uid || !user.email) {
      alert("Please sign in to start your free trial.");
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
      if (!data?.url) throw new Error("Missing checkout URL");

      window.location.assign(data.url);
    } catch (e: any) {
      alert(e?.message || "Stripe checkout failed. Please try again.");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    if (!user?.email) {
      alert("Please sign in to manage billing.");
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
      if (!data?.url) throw new Error("Missing portal URL");

      window.location.assign(data.url);
    } catch (e: any) {
      alert(e?.message || "Could not open billing portal. Please try again.");
    } finally {
      setManaging(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-14">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            EmailResponder for Gmail™
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            AI-powered replies <span className="font-semibold">inside Gmail</span> — faster,
            smarter, and more consistent communication.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Not affiliated with Google. Gmail is a trademark of Google LLC.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white dark:bg-gray-950 p-8 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Pro Plan
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  7-day free trial. Cancel anytime.
                </p>
              </div>

              <div className="text-right">
                <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  $4.99
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  per month
                </div>
              </div>
            </div>

            {/* Status */}
            {user && (
              <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm">
                {statusLoading ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    Checking subscription…
                  </span>
                ) : statusError ? (
                  <span className="text-red-600">{statusError}</span>
                ) : subscribed ? (
                  <div className="text-green-700 dark:text-green-400">
                    <div className="font-semibold">Active subscription</div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Status: {status?.status || "active"}
                      {renewsOn ? ` • Renews on ${renewsOn}` : ""}
                    </div>
                  </div>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">
                    No active subscription
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {user ? (
                <>
                  {!subscribed && (
                    <button
                      onClick={handleUpgrade}
                      disabled={upgrading || statusLoading}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                      {upgrading ? "Processing…" : "Start Free Trial"}
                    </button>
                  )}

                  <button
                    onClick={handleManageBilling}
                    disabled={managing}
                    className="w-full rounded-xl bg-gray-800 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-500"
                  >
                    {managing ? "Loading…" : "Manage Billing"}
                  </button>

                  {subscribed && (
                    <Link
                      href="/emailresponder"
                      className="block w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      Go to App
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
                    Please sign in to start your 7-day free trial.
                  </div>
                  <Link
                    href="/sign-in"
                    className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Fine print */}
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              By subscribing, you agree to our{" "}
              <a
                href="https://skyntco.com/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="https://skyntco.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* What's included */}
          <div className="rounded-2xl bg-white dark:bg-gray-950 p-8 shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              What’s included
            </h3>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-gray-300">
              <li>• AI replies directly inside Gmail</li>
              <li>• Multiple tones + multi-language support</li>
              <li>• Unlimited email replies</li>
              <li>• Faster replies for support, sales, and everyday emails</li>
              <li>• Priority support</li>
            </ul>

            <div className="mt-6 rounded-xl bg-blue-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-300">
              Tip: After you subscribe, open Gmail and launch{" "}
              <span className="font-semibold">EmailResponder for Gmail™</span>{" "}
              from the add-ons panel.
            </div>

            <div className="mt-6">
              <Link
                href="/"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SkyntCo LLC. All rights reserved.
        </div>
      </div>
    </main>
  );
}
