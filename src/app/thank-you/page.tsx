"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ThankYouPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/emailresponder");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-green-600 mb-4">🎉 Thank You!</h1>
        <p className="text-lg text-gray-700 mb-6">
          Welcome to EmailResponder! You're all set to start using the app 🚀
        </p>
        <button
          onClick={() => router.push("/emailresponder")}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Go to App
        </button>
      </div>
    </div>
  );
}
