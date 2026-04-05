import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MyFeed — Your Internet, Curated by AI",
  description:
    "Describe what you care about in plain English. MyFeed scans thousands of sources and delivers only what matters to you.",
  keywords: [
    "AI feed aggregator",
    "personalized news",
    "RSS alternative",
    "AI news curator",
    "custom news feed",
    "content curation AI",
  ],
  metadataBase: new URL("https://myfeed.space"),
  openGraph: {
    title: "MyFeed — Your Internet, Curated by AI",
    description:
      "Describe what you care about in plain English. MyFeed scans thousands of sources and delivers only what matters to you.",
    url: "https://myfeed.space",
    siteName: "MyFeed",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://myfeed.space/og.png",
        width: 1200,
        height: 630,
        alt: "MyFeed — Your Internet, Curated by AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyFeed — Your Internet, Curated by AI",
    description:
      "Describe what you care about in plain English. MyFeed scans thousands of sources and delivers only what matters to you.",
    images: ["https://myfeed.space/og.png"],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MyFeed",
              url: "https://myfeed.space",
              description: "AI-powered personalized news feed. Describe what you care about and get curated content from across the internet.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://myfeed.space/login?signup=true&prompt={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
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
