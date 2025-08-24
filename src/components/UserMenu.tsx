"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState<"portal" | "cancel" | "install" | "signout" | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Grab the logged-in user's email for billing actions
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setEmail(u?.email ?? null));
    return () => unsub();
  }, []);

  // Capture beforeinstallprompt to allow "Create Shortcut"
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault?.();
      setDeferredPrompt(e as DeferredPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  // Close the menu on outside click / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleInstall() {
    if (deferredPrompt) {
      setBusy("install");
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        setDeferredPrompt(null);
        setBusy(null);
        setOpen(false);
      }
    } else {
      // No PWA prompt available; show quick help
      setShowInstallHelp(true);
      setOpen(false);
    }
  }

  async function handleCancel() {
    if (!email) {
      alert("Please sign in first.");
      return;
    }
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
      setShowConfirmCancel(false);
      setOpen(false);
    }
  }

  async function handleSignOut() {
    setBusy("signout");
    try {
      await signOut(auth);
    } finally {
      setBusy(null);
      setOpen(false);
      router.push("/sign-in");
    }
  }

  const avatarLetter = email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        title={email || "Account"}
      >
        <span className="font-semibold">{avatarLetter}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-1 z-50"
        >
          <div className="px-3 py-2 text-xs text-gray-500">{email ?? "Signed in"}</div>
          <hr className="my-1" />

          <button
            onClick={handleInstall}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
            role="menuitem"
            disabled={busy === "install"}
          >
            {busy === "install" ? "Opening…" : deferredPrompt ? "Create Shortcut (Install App)" : "Create Shortcut…"}
          </button>

          <button
            onClick={() => {
              setShowConfirmCancel(true);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-red-600"
            role="menuitem"
          >
            Cancel Subscription
          </button>

          <hr className="my-1" />

          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
            role="menuitem"
            disabled={busy === "signout"}
          >
            {busy === "signout" ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      {/* Confirm cancel dialog */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Cancel subscription?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will cancel at the end of your current billing period. You can resume anytime.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowConfirmCancel(false)}
              >
                Keep
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleCancel}
                disabled={busy === "cancel"}
              >
                {busy === "cancel" ? "Cancelling…" : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install help sheet */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-3">Create a desktop shortcut</h3>
            <p className="text-sm text-gray-700 mb-2">
              Your browser didn’t expose the install prompt. You can still create a shortcut:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li><b>Chrome / Edge (Windows):</b> Menu → <i>Install App</i> (or <i>Save and share → Install page as app</i>).</li>
              <li><b>macOS Safari:</b> Share icon → <i>Add to Dock</i>.</li>
              <li><b>iOS Safari:</b> Share icon → <i>Add to Home Screen</i>.</li>
              <li><b>Android Chrome:</b> Menu → <i>Install app</i>.</li>
            </ul>
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowInstallHelp(false)}
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
