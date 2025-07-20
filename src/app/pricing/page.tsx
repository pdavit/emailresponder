'use client';

import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleSubscribe = () => {
    if (isSignedIn) {
      router.push('/subscribe');
    } else {
      router.push('/sign-in');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
            href="/"
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Back to Home
          </a>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that works best for you. No hidden fees, no surprises.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Pro Plan
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Everything you need to transform your email workflow
              </p>
            </div>

            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-gray-900 dark:text-white">$9</span>
                <span className="text-xl text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Cancel anytime • No setup fees
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Unlimited AI email replies</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Multiple languages support</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Formal and informal tones</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Email history and management</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Secure and private</span>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleSubscribe}
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {isSignedIn ? 'Subscribe Now' : 'Get Started'}
                <ArrowRightIcon className="h-5 w-5" />
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                {isSignedIn ? 'Start your subscription today' : 'Sign up and start your free trial'}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel my subscription anytime?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your current billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can try our demo to see how it works, and when you sign up, you get immediate access to all features.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                How secure is my data?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Your emails are processed securely with enterprise-grade encryption. We never store or share your email content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 