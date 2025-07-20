import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmailResponder – AI-Powered Email Reply Generator",
  description: "Generate professional email replies with AI assistance. Support for multiple languages and tones.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900`}
        >
          <SignedIn>
            <header className="w-full px-4 py-3 flex justify-end items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-[2px] rounded-full">
                <div className="bg-white dark:bg-gray-950 rounded-full p-1 shadow-md">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </header>
            <main>{children}</main>
          </SignedIn>

          <SignedOut>
            {/* Only show the sign-in/sign-up content */}
            <main>{children}</main>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
