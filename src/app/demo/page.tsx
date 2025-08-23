'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, ClipboardIcon, ArrowPathIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Dummy data for the demo
const demoData = {
  subject: "Project Update Request",
  originalEmail: `Hi there,

I hope this email finds you well. I wanted to follow up on the project we discussed last week regarding the new website redesign.

Could you please provide an update on:
1. Current progress status
2. Any blockers or challenges you're facing
3. Estimated timeline for completion
4. Next steps and deliverables

I have a meeting with stakeholders on Friday and would like to share the latest status.

Thanks in advance for your help!

Best regards,
Sarah Johnson
Marketing Director`,
  language: "english",
  tone: "formal",
  generatedReply: `Dear Sarah,

Thank you for reaching out regarding the website redesign project. I appreciate your patience as we work through this important initiative.

Here's a comprehensive update on the current status:

**Current Progress:**
- Design phase: 85% complete
- Frontend development: 60% complete
- Backend integration: 40% complete

**Challenges & Blockers:**
- We're currently waiting for final brand guidelines from the design team
- The payment gateway integration requires additional security review
- Content migration is taking longer than anticipated due to legacy system constraints

**Timeline Update:**
Based on current progress and remaining work, we're looking at:
- Design completion: End of this week
- Development completion: 2 weeks from now
- Testing and QA: 1 week
- **Estimated launch date: 3 weeks from today**

**Next Steps:**
1. Complete design approval process (this week)
2. Finalize payment integration (next week)
3. Begin comprehensive testing (week 3)
4. Prepare launch checklist and documentation

I'll send you a detailed progress report by Wednesday, which should give you everything you need for your Friday stakeholder meeting.

Please let me know if you need any additional information or have questions about the timeline.

Best regards,
[Your Name]
Project Manager`
};

export default function DemoPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Redirect signed-in users to the full app
  useEffect(() => {
    if (isSignedIn && !loading) {
      router.push('/emailresponder');
    }
  }, [isSignedIn, loading, router]);

  // Disable copy/paste and selection
  useEffect(() => {
    const preventCopy = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable copy (Ctrl+C)
    document.addEventListener('copy', preventCopy);
    // Disable right-click context menu
    document.addEventListener('contextmenu', preventContextMenu);
    // Disable text selection
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('mousedown', preventSelection);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('mousedown', preventSelection);
    };
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Demo Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-yellow-800 dark:text-yellow-200">
            <LockClosedIcon className="h-5 w-5" />
            <span className="font-medium">This is a demo. Please sign in to try it yourself.</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Email Responder Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            See how AI generates professional email replies (read-only demo)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form - Disabled */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative">
            {/* Overlay to prevent interaction */}
            <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-700/50 rounded-xl z-10 flex items-center justify-center">
              <div className="text-center">
                <LockClosedIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Demo Mode - Input Disabled</p>
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Email Details
            </h2>
            
            <div className="space-y-6 opacity-50">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={demoData.subject}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="Enter email subject..."
                />
              </div>

              {/* Original Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Original Email
                </label>
                <textarea
                  value={demoData.originalEmail}
                  disabled
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed resize-none"
                  placeholder="Paste the original email here..."
                />
              </div>

              {/* Language and Tone Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={demoData.language}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  >
                    <option value="english">English</option>
                    <option value="spanish">Spanish</option>
                    <option value="german">German</option>
                    <option value="french">French</option>
                    <option value="chinese-simplified">Chinese Simplified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={demoData.tone}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  >
                    <option value="formal">Formal</option>
                    <option value="informal">Informal</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons - Disabled */}
              <div className="flex gap-3">
                <button
                  disabled
                  className="flex-1 bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Generate Reply
                </button>
                <button
                  disabled
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 font-medium rounded-lg cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Generated Reply - Read Only */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Generated Reply
              </h2>
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                <LockClosedIcon className="h-4 w-4" />
                <span className="text-sm">Demo Mode</span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[300px]">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                {demoData.generatedReply}
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to try it yourself?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sign up for free and start generating professional email replies in seconds.
            </p>
            <a
              href="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-105"
            >
              Get Started
              <ArrowPathIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 