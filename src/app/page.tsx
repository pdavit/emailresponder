'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleGetStarted = async () => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/subscription-status');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.hasActiveSubscription) {
          router.push('/emailresponder');
        } else {
          // Redirect to Stripe checkout
          window.location.href = 'https://buy.stripe.com/28E5kD6EFbEwgeA8ng2B201';
        }
      } else {
        // If there's an error, redirect to Stripe checkout as fallback
        window.location.href = 'https://buy.stripe.com/28E5kD6EFbEwgeA8ng2B201';
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // On error, redirect to Stripe checkout as fallback
      window.location.href = 'https://buy.stripe.com/28E5kD6EFbEwgeA8ng2B201';
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main hero section */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            EmailResponder
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            AI-Powered Email Reply Generator
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleGetStarted}
              disabled={isChecking}
              className="inline-block bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center mx-auto"
            >
              {isChecking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking...
                </>
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Trial promotion section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Start Your 7-Day Free Trial of EmailResponder
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            AI-powered assistant that instantly writes professional emails. Change tone, rewrite content, and reply faster — in seconds.
          </p>
          <a
            href="https://buy.stripe.com/28E5kD6EFbEwgeA8ng2B201"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg mb-4"
          >
            Start Free Trial
          </a>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Just $4.99/month after 7 days. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
