import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://myfeed.space";

const FEED_SLUGS = [
  "tech", "ai", "startups", "dev", "science",
  "crypto", "design", "security", "gaming", "business",
  "space", "health", "climate", "fintech", "devops",
  "data", "mobile", "marketing",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    ...FEED_SLUGS.map((slug) => ({
      url: `${BASE}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
