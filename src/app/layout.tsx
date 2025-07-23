import { ClerkProvider } from "@clerk/nextjs";
import { Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900`}
        >
          <ErrorBoundary>
            <Header />
            <main>{children}</main>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
