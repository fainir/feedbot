import { NextResponse } from "next/server";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit(`reader:${getClientKey(req)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the article HTML
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FeedBot/1.0; +https://feedbot.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch article" }, { status: 502 });
    }

    const html = await response.text();

    // Extract article content using simple heuristics
    const article = extractArticle(html, parsedUrl.hostname);

    return NextResponse.json(article);
  } catch (err) {
    console.error("Reader error:", err);
    return NextResponse.json({ error: "Failed to parse article" }, { status: 500 });
  }
}

function extractArticle(html: string, hostname: string) {
  // Extract title
  const titleMatch =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = decodeEntities(titleMatch?.[1] || "");

  // Extract author
  const authorMatch =
    html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+property="article:author"[^>]+content="([^"]+)"/i);
  const author = decodeEntities(authorMatch?.[1] || "");

  // Extract site name
  const siteMatch = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i);
  const siteName = decodeEntities(siteMatch?.[1] || hostname);

  // Extract excerpt
  const excerptMatch =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  const excerpt = decodeEntities(excerptMatch?.[1] || "");

  // Extract main content
  const content = extractMainContent(html);

  // Count words
  const textContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  return { title, content, author, siteName, excerpt, wordCount };
}

function extractMainContent(html: string): string {
  // Remove scripts, styles, nav, header, footer, aside
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to find <article> tag first
  const articleMatch = cleaned.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return sanitizeHtml(articleMatch[1]);
  }

  // Try to find main content area
  const mainMatch = cleaned.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return sanitizeHtml(mainMatch[1]);
  }

  // Try common content class names
  const contentPatterns = [
    /class="[^"]*(?:article-body|article-content|post-content|entry-content|story-body|post-body)[^"]*"[\s\S]*?>([\s\S]*?)<\/(?:div|section)/i,
    /id="(?:article|content|main-content|post-content)"[\s\S]*?>([\s\S]*?)<\/(?:div|section)/i,
  ];

  for (const pattern of contentPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return sanitizeHtml(match[1]);
    }
  }

  // Fallback: find the largest cluster of <p> tags
  const paragraphs = cleaned.match(/<p[\s\S]*?<\/p>/gi) || [];
  if (paragraphs.length > 2) {
    return sanitizeHtml(paragraphs.join("\n"));
  }

  // Last resort — return excerpt-friendly content
  return "<p>This article could not be extracted in reader mode. Please open the original link.</p>";
}

function sanitizeHtml(html: string): string {
  // Keep only safe tags
  const allowedTags = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "em", "strong", "b", "i", "a", "br", "hr",
    "img", "figure", "figcaption", "span", "div",
    "table", "thead", "tbody", "tr", "td", "th",
  ]);

  // Remove event handlers and dangerous attributes
  let cleaned = html
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "safe-data:")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<input[^>]*>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "");

  // Add target="_blank" to all links
  cleaned = cleaned.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');

  return cleaned;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}
