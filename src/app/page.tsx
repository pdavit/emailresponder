'use client';

import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ER</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">EmailResponder</span>
          </div>
          <a
            href="/sign-in"
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            AI-Powered Email
            <span className="text-blue-600 dark:text-blue-400"> Responses</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Generate professional, context-aware email replies in seconds. 
            Save time and maintain consistency across all your communications.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a
              href="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started
              <ArrowRightIcon className="h-5 w-5" />
            </a>
            <a
              href="/emailresponder"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-gray-500 font-semibold rounded-xl text-lg transition-all duration-200"
            >
              Try Demo
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
            <p className="text-gray-600 dark:text-gray-400">Generate professional email replies in seconds, not minutes.</p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Context Aware</h3>
            <p className="text-gray-600 dark:text-gray-400">AI understands your email context and generates appropriate responses.</p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h3>
            <p className="text-gray-600 dark:text-gray-400">Your emails are processed securely with enterprise-grade privacy protection.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-blue-600 dark:bg-blue-700 rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Email Workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who are already saving hours every week.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-105"
          >
            Start Free Trial
            <ArrowRightIcon className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 EmailResponder. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
