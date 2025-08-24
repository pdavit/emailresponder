"use client";

import { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function BillingButtons() {
  const [busy, setBusy] = useState<"portal" | "cancel" | null>(null);

  async function getUserEmail(): Promise<string | null> {
    return new Promise((res) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        res(u?.email ?? null);
      });
    });
  }

  async function goToPortal() {
    const email = await getUserEmail();
    if (!email) {
      alert("Please sign in to manage billing.");
      return;
    }
    setBusy("portal");
    try {
      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { url, error } = await r.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Could not open the billing portal.");
    } finally {
      setBusy(null);
    }
  }

  // Optional: cancel in-app (cancels at period end)
  async function cancelAtPeriodEnd() {
    const email = await getUserEmail();
    if (!email) {
      alert("Please sign in first.");
      return;
    }
    if (!confirm("Cancel your subscription at the end of the current period?")) return;

    setBusy("cancel");
    try {
      const r = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, immediately: false }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Cancellation failed.");
      alert("Your subscription will cancel at the period end.");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Cancellation failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={goToPortal}
        disabled={busy !== null}
        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md disabled:opacity-60"
        title="Update card, invoices, cancel, etc."
      >
        {busy === "portal" ? "Opening..." : "Manage Billing"}
      </button>

      {/* Remove this button if you prefer to force all changes via Stripe Portal */}
      <button
        onClick={cancelAtPeriodEnd}
        disabled={busy !== null}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-60"
      >
        {busy === "cancel" ? "Cancelling..." : "Cancel Subscription"}
      </button>
    </div>
  );
}
