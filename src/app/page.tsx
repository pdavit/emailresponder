'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  const setupDemoUser = async () => {
    setIsSettingUp(true);
    setSetupMessage('');
    
    try {
      const response = await fetch('/api/demo/setup', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSetupMessage('Demo user created successfully! You can now access the Email Responder.');
      } else {
        setSetupMessage('Failed to create demo user. Please try again.');
      }
    } catch {
      setSetupMessage('Error setting up demo user. Please try again.');
    } finally {
      setIsSettingUp(false);
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
            <Link
              href="/emailresponder"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Get Started
            </Link>
            
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Demo: Set up a test user with active subscription
              </p>
              <button
                onClick={setupDemoUser}
                disabled={isSettingUp}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm"
              >
                {isSettingUp ? 'Setting up...' : 'Setup Demo User'}
              </button>
              {setupMessage && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  {setupMessage}
                </p>
              )}
            </div>
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
