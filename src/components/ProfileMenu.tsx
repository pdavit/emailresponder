"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  CreditCardIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type Props = { userEmail?: string | null };

export default function ProfileMenu({ userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [isPortal, setIsPortal] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Close on outside click + Esc */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setIsCancelOpen(false);
        setShowInstallHelp(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const initial = () => {
    const t = (userEmail || "U").trim();
    return t ? t[0]!.toUpperCase() : "U";
  };

  async function gotoBillingPortal() {
    try {
      if (!userEmail) return alert("You're not signed in.");
      setIsPortal(true);
      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await r.json().catch(() => ({} as any));
      if (!r.ok || !data?.url) {
        alert(data?.error || "Couldn't open billing portal.");
      } else {
        window.location.href = data.url as string;
      }
    } finally {
      setIsPortal(false);
      setOpen(false);
    }
  }

  async function handleCancelSubscription(email: string) {
    if (!email) return alert("You're not signed in.");

    setIsCancelling(true);
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, immediate: true }), // immediate cancel
      });

      // Safely parse JSON (API might return empty)
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        /* ignore parse errors */
      }

      if (!res.ok) {
        alert(payload?.error || payload?.message || "Failed to cancel.");
        return;
      }

      if (payload?.immediate) {
        alert("Your subscription has been cancelled immediately. No refunds will be issued.");
      } else {
        const when = payload?.currentPeriodEnd
          ? new Date(payload.currentPeriodEnd * 1000).toLocaleString()
          : "the end of your current period";
        alert(`Your subscription will end at ${when}.`);
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert("Network error. Please try again.");
    } finally {
      setIsCancelling(false);
      setIsCancelOpen(false);
    }
  }

  /* Pre-bound click handler to satisfy React's MouseEventHandler type */
  const onConfirmCancelClick = () =>
    handleCancelSubscription(userEmail ?? "");

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="h-9 w-9 rounded-full bg-indigo-600 text-white grid place-items-center font-semibold shadow"
      >
        {initial()}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border bg-white shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 text-sm text-gray-600 border-b">
            <div className="font-medium text-gray-900">{userEmail || "—"}</div>
            <div className="text-xs">Account</div>
          </div>

          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50"
            onClick={() => setShowInstallHelp(true)}
          >
            <Squares2X2Icon className="h-5 w-5 text-gray-500" />
            Create desktop shortcut
          </button>

          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-60"
            onClick={gotoBillingPortal}
            disabled={isPortal}
            title={!userEmail ? "Sign in to manage billing" : undefined}
          >
            <CreditCardIcon className="h-5 w-5 text-gray-500" />
            {isPortal ? "Opening billing…" : "Manage billing"}
          </button>

          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-60"
            onClick={() => setIsCancelOpen(true)}
            disabled={!userEmail}
            title={!userEmail ? "Sign in to cancel subscription" : undefined}
          >
            <XCircleIcon className="h-5 w-5 text-gray-500" />
            Cancel subscription
          </button>

          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 border-t"
            onClick={() => signOut(auth)}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-500" />
            Sign out
          </button>
        </div>
      )}

      {/* Cancel confirm modal */}
      {isCancelOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-[60]">
          <div className="bg-white rounded-xl p-6 shadow-xl w-[min(92vw,420px)]">
            <h3 className="text-lg font-semibold mb-1">Cancel subscription?</h3>
            <p className="text-sm text-gray-600 mb-5">
              This will cancel <b>immediately</b>. No refunds will be issued. You can re-subscribe
              any time.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                onClick={() => setIsCancelOpen(false)}
                disabled={isCancelling}
              >
                Keep
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={onConfirmCancelClick}
                disabled={isCancelling || !userEmail}
                title={!userEmail ? "Sign in to cancel subscription" : undefined}
              >
                {isCancelling ? "Cancelling…" : "Cancel subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* “Install app / shortcut” helper */}
      {showInstallHelp && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-[60]">
          <div className="bg-white rounded-xl p-6 shadow-xl w-[min(92vw,480px)]">
            <h3 className="text-lg font-semibold mb-2">Create desktop shortcut</h3>
            <p className="text-sm text-gray-600">
              In Chrome/Edge: open the menu → <b>Install app</b> (or <b>Save and share</b> →{" "}
              <b>Create shortcut</b>). On iOS Safari: Share → <b>Add to Home Screen</b>.
            </p>
            <div className="mt-4 text-right">
              <button
                onClick={() => setShowInstallHelp(false)}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
