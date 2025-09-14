// src/app/emailresponder-demo/page.tsx
// Server component: no "use client"

import { ArrowPathIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import DemoGuards from "./_client-guards";

export const metadata = {
  title: "EmailResponder Demo — EmailReply 365",
  description:
    "See how EmailResponder generates professional replies. Public, read-only demo (no sign-in required).",
};

const demo = {
  subject: "Follow-up on proposal",
  body: `Hi team,

Could you share an update on the proposal review and any feedback?
Thanks!`,
  reply: `Hi there,

Thanks for following up — here's where we are... (demo reply content)`,
};

export default function EmailResponderDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Client-only guards: block copy / selection / right-click */}
      <DemoGuards />

      {/* Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="max-w-6xl mx-auto px-4 py-3 text-center text-yellow-900 dark:text-yellow-200 flex items-center gap-2 justify-center">
          <LockClosedIcon className="h-5 w-5" aria-hidden />
          <span className="font-medium">This is a demo. Please sign in to try it yourself.</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: disabled composer */}
        <section
          aria-labelledby="demo-details-heading"
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 relative"
        >
          {/* Overlay to prevent interaction */}
          <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-700/50 rounded-xl z-10 flex items-center justify-center">
            <div className="text-center">
              <LockClosedIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" aria-hidden />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Demo Mode — Input Disabled</p>
            </div>
          </div>

          <h2 id="demo-details-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Email Details
          </h2>

          <div className="space-y-4 opacity-50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
            <input
              disabled
              value={demo.subject}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
            />

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Original Email</label>
            <textarea
              disabled
              rows={8}
              value={demo.body}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
            />

            <div className="flex gap-3">
              <button
                disabled
                className="flex-1 bg-gray-400 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2"
              >
                <ArrowPathIcon className="h-5 w-5" aria-hidden /> Generate Reply
              </button>
              <button
                disabled
                className="px-6 py-3 border rounded-lg text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* Right: read-only reply */}
        <section
          aria-labelledby="demo-reply-heading"
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="demo-reply-heading" className="text-2xl font-semibold text-gray-900 dark:text-white">
              Generated Reply
            </h2>
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <LockClosedIcon className="h-4 w-4" aria-hidden /> <span className="text-sm">Demo Mode</span>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[300px] whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {demo.reply}
          </div>
        </section>
      </main>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Ready to try it yourself?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in for the full, interactive EmailResponder experience.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
          >
            Sign in
            <ArrowPathIcon className="h-5 w-5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
