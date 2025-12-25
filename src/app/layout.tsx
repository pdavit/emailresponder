import { Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmailResponder for Gmail™ — AI Email Replies in Gmail",
  description:
    "EmailResponder for Gmail™ is an AI-powered Gmail add-on that helps you generate professional replies in seconds—right inside Gmail. Multiple tones and languages.",
  applicationName: "EmailResponder for Gmail™",
  metadataBase: new URL("https://app.skyntco.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "EmailResponder for Gmail™",
    description:
      "AI-powered Gmail add-on to generate professional email replies directly inside Gmail.",
    url: "https://app.skyntco.com",
    siteName: "SkyntCo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EmailResponder for Gmail™",
    description:
      "AI-powered Gmail add-on to generate professional email replies directly inside Gmail.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
