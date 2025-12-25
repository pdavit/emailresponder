'use client';

import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function HomePage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push('/emailresponder');
    } else {
      router.push('/sign-in');
    }
  };

  const handleTryDemo = () => {
    router.push('/emailresponder-demo');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            EmailResponder for Gmail<span className="text-blue-600 dark:text-blue-400">™</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            An AI-powered Gmail add-on that helps you write smarter, faster,
            and more professional email replies directly inside Gmail.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Start Free Trial
              <ArrowRightIcon className="h-5 w-5" />
            </button>

            <button
              onClick={handleTryDemo}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-gray-500 font-semibold rounded-xl text-lg transition-all duration-200"
            >
              Try Demo
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Free 7-day trial · Then $4.99/month · Cancel anytime
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Feature
            title="Lightning Fast"
            description="Generate high-quality email replies in seconds without breaking your workflow."
            color="blue"
            iconPath="M13 10V3L4 14h7v7l9-11h-7z"
          />
          <Feature
            title="Context Aware"
            description="Understands your email context and suggests responses that actually make sense."
            color="green"
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <Feature
            title="Secure & Private"
            description="Designed with privacy in mind. Your emails stay protected at all times."
            color="purple"
            iconPath="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-blue-600 dark:bg-blue-700 rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Write Better Gmail Replies — Instantly
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Save time, reduce stress, and stay consistent with EmailResponder for Gmail™.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-105"
          >
            Start Free Trial
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400 space-y-2">
        <div className="space-x-4">
          <a href="https://skyntco.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Privacy Policy
          </a>
          <span>|</span>
          <a href="https://skyntco.com/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Terms of Service
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} SkyntCo LLC. EmailResponder for Gmail™ is not affiliated with Google LLC.</p>
      </footer>
    </main>
  );
}

/* Small helper component */
function Feature({
  title,
  description,
  color,
  iconPath,
}: {
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple';
  iconPath: string;
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="text-center p-6">
      <div className={`w-16 h-16 ${colors[color]} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
