import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

interface DiscoveredFeed {
  title: string;
  url: string;
  type: string;
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 discover requests per minute (fetches external URLs)
  const rl = rateLimit(`discover:${getClientKey(request)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetUrl = body.url?.trim();
  if (!targetUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // SSRF protection: only allow http/https and block private IPs
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only HTTP/HTTPS URLs allowed" }, { status: 400 });
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" ||
      hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("172.") ||
      hostname.startsWith("169.254.") || // Cloud metadata (AWS/GCP IMDS)
      hostname === "[::1]" || hostname.startsWith("[fc") || hostname.startsWith("[fe80") || // IPv6 private
      hostname === "metadata.google.internal") {
    return NextResponse.json({ error: "Private/local URLs not allowed" }, { status: 400 });
  }

  try {
    // Fetch the page
    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "FeedBot/1.0 (RSS Discovery)",
        Accept: "text/html, application/xhtml+xml, application/xml",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${res.status})` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const html = await res.text();
    const feeds: DiscoveredFeed[] = [];

    // Check if the URL itself is an RSS feed
    if (
      contentType.includes("xml") ||
      contentType.includes("rss") ||
      contentType.includes("atom") ||
      html.trimStart().startsWith("<?xml") ||
      html.includes("<rss") ||
      html.includes("<feed")
    ) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      feeds.push({
        title: titleMatch?.[1]?.trim() || parsedUrl.hostname,
        url: parsedUrl.toString(),
        type: "rss",
      });
    }

    // Parse HTML for RSS/Atom link tags
    const linkRegex =
      /<link[^>]+type\s*=\s*["'](application\/(?:rss|atom)\+xml|text\/xml)["'][^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const tag = match[0];
      const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      const titleMatch = tag.match(/title\s*=\s*["']([^"']+)["']/i);
      if (hrefMatch) {
        let feedUrl = hrefMatch[1];
        // Resolve relative URLs
        if (feedUrl.startsWith("/")) {
          feedUrl = `${parsedUrl.origin}${feedUrl}`;
        } else if (!feedUrl.startsWith("http")) {
          feedUrl = new URL(feedUrl, parsedUrl.toString()).toString();
        }
        feeds.push({
          title:
            titleMatch?.[1]?.trim() ||
            `${parsedUrl.hostname} Feed`,
          url: feedUrl,
          type: match[1].includes("atom") ? "atom" : "rss",
        });
      }
    }

    // Common RSS paths to try if no feeds found in HTML
    if (feeds.length === 0) {
      const commonPaths = [
        "/feed",
        "/rss",
        "/feed.xml",
        "/rss.xml",
        "/atom.xml",
        "/index.xml",
        "/feeds/posts/default",
      ];

      for (const path of commonPaths) {
        try {
          const testUrl = `${parsedUrl.origin}${path}`;
          const testRes = await fetch(testUrl, {
            method: "HEAD",
            headers: { "User-Agent": "FeedBot/1.0 (RSS Discovery)" },
            signal: AbortSignal.timeout(5_000),
          });
          if (testRes.ok) {
            const ct = testRes.headers.get("content-type") || "";
            if (
              ct.includes("xml") ||
              ct.includes("rss") ||
              ct.includes("atom")
            ) {
              feeds.push({
                title: `${parsedUrl.hostname} Feed`,
                url: testUrl,
                type: "rss",
              });
              break;
            }
          }
        } catch {}
      }
    }

    // Deduplicate by URL
    const unique = feeds.filter(
      (f, i, arr) => arr.findIndex((x) => x.url === f.url) === i
    );

    return NextResponse.json({
      feeds: unique,
      source: parsedUrl.hostname,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to discover feeds" },
      { status: 500 }
    );
  }
}
