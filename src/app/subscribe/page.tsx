'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$9.99',
    period: 'month',
    features: [
      'Unlimited email replies',
      '5 languages supported',
      'Basic tone options',
      'Email history',
      'Standard support'
    ],
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: '$19.99',
    period: 'month',
    features: [
      'Everything in Basic',
      'All languages supported',
      'Advanced tone options',
      'Priority support',
      'Export functionality',
      'Team collaboration'
    ],
    popular: true
  }
];

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, you would:
      // 1. Create a Stripe checkout session
      // 2. Redirect to Stripe checkout
      // 3. Handle webhook for successful payment
      
      // For demo purposes, we'll simulate a successful subscription
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          userId: 'demo-user-id', // In real app, get from auth
        }),
      });

      if (response.ok) {
        // Redirect to email responder after successful subscription
        window.location.href = '/emailresponder';
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Upgrade to Pro
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock the full potential of EmailResponder with our premium subscription plans. 
            Generate unlimited professional email replies with advanced features.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-2 transition-all duration-200 ${
                selectedPlan === plan.id
                  ? 'border-blue-500 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-600'
              } ${plan.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <StarIcon className="h-4 w-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /{plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  selectedPlan === plan.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Subscribe Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 px-8 rounded-lg text-lg transition-colors duration-200 flex items-center mx-auto"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              `Subscribe to ${plans.find(p => p.id === selectedPlan)?.name}`
            )}
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">
            Cancel anytime. No long-term commitment required.
          </p>
          <p>
            Already have an account?{' '}
            <Link href="/emailresponder" className="text-blue-600 dark:text-blue-400 hover:underline">
              Try accessing the app
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 