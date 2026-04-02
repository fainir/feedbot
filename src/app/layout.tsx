import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { ToastProvider } from "@/components/ui/toast";
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
  metadataBase: new URL("https://feedbot-production.up.railway.app"),
  openGraph: {
    title: "FeedBot — Your Internet, Curated by AI",
    description:
      "Describe what you care about. FeedBot scans the internet and delivers a personalized feed — no RSS links needed.",
    url: "https://feedbot-production.up.railway.app",
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
