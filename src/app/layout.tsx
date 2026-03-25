import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FeedBot — Your Internet, Curated by AI",
  description:
    "Describe what you care about in plain English. FeedBot scans the entire internet and delivers a personalized, real-time feed. Free to start.",
  keywords: [
    "AI feed aggregator",
    "personalized news",
    "RSS alternative",
    "AI news curator",
    "custom news feed",
    "content curation AI",
  ],
  metadataBase: new URL("https://feedbot-eight.vercel.app"),
  openGraph: {
    title: "FeedBot — Your Internet, Curated by AI",
    description:
      "Describe what you care about. FeedBot scans the internet and delivers a personalized feed — no RSS links needed.",
    url: "https://feedbot-eight.vercel.app",
    siteName: "FeedBot",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FeedBot — Your Internet, Curated by AI",
    description:
      "Describe what you care about. FeedBot scans the internet and delivers a personalized feed — no RSS links needed.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
