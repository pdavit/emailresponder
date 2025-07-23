// src/components/Header.tsx
'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="w-full px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">ER</span>
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          EmailResponder
        </span>
      </div>

      <div>
        <SignedIn>
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-[2px] rounded-full">
            <div className="bg-white dark:bg-gray-950 rounded-full p-1 shadow-md">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          <a
            href="/sign-in"
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Sign In
          </a>
        </SignedOut>
      </div>
    </header>
  );
}
