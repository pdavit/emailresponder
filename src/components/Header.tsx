// src/components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function Header() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
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
        <div></div>
      </header>
    );
  }

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
    
      <div className="flex items-center gap-6">
  <a
    href="https://skyntco.com/legal/privacy"
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm hover:underline"
  >
    Privacy Policy
  </a>

  {isSignedIn ? (
    <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-[2px] rounded-full">
      <div className="bg-white dark:bg-gray-950 rounded-full p-1 shadow-md">
        <button
          onClick={handleSignOut}
          className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  ) : (
    <a
      href="/sign-in"
      className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
    >
      Sign in
    </a>
  )}
</div>
    </header>
  );
}
