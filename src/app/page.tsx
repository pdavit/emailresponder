'use client';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <h1 className="text-4xl font-bold mb-4">Welcome to EmailResponder 💌</h1>
      <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
        Sign in to get started with AI-powered email replies.
      </p>
      <a
        href="/sign-in"
        className="px-6 py-3 bg-blue-600 text-white rounded-xl text-lg hover:bg-blue-700 transition"
      >
        Get Started
      </a>
    </main>
  );
}
