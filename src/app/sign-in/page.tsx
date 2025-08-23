"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to the app
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/emailresponder");
    });
    return unsub;
  }, [router]);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/emailresponder");
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      // Try popup; fall back to redirect (Safari / some mobile)
      try {
        await signInWithPopup(auth, provider);
      } catch {
        await signInWithRedirect(auth, provider);
        return; // redirect will come back here
      }

      router.replace("/emailresponder");
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Welcome back
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
          Sign in to your account to continue
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Email / password form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 transition-colors"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">or</span>
          <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-md py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {/* Simple G icon */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42v-.1H24v7.2h11.3A12.9 12.9 0 0 1 24 39a15 15 0 1 0 0-30c4 0 7.6 1.5 10.4 4l5-5C35.5 4.6 30 2.4 24 2.4 12 2.4 2.4 12 2.4 24S12 45.6 24 45.6c12 0 21.6-9.6 21.6-21.6 0-1.6-.2-2.8-.6-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C14 16 18.7 12.8 24 12.8c4 0 7.6 1.5 10.4 4l5-5C35.5 4.6 30 2.4 24 2.4 15.4 2.4 8 7.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 45.6c6.4 0 12.2-2.6 16.2-6.8l-5.9-4.8c-2.6 2.4-6 3.8-10.2 3.8-7.9 0-14.5-5.3-16.9-12.5l-6 4.7C4 39.5 13.1 45.6 24 45.6z"/>
            <path fill="#1976D2" d="M43.6 20.5H42v-.1H24v7.2h11.3c-1.4 4-5.1 6.8-9.3 6.8-4.2 0-7.8-2.8-9.1-6.6l-6 4.7C13 39.5 18.1 42.4 24 42.4c8.9 0 16.3-6.1 18.6-14.4.6-1.7 1-3.5 1-5.5 0-1.2-.1-2-0-2z"/>
          </svg>
          {busy ? "Please wait…" : "Continue with Google"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
