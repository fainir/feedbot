import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "rss";

  const { data: feed } = await supabase
    .from("feeds")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_id", id)
    .order("published_at", { ascending: false })
    .limit(50);

  if (format === "json") {
    return NextResponse.json({
      feed: {
        id: feed.id,
        name: feed.name,
        description: feed.description || feed.query_text,
        query: feed.query_text,
        lastRefreshed: feed.last_refreshed_at,
      },
      items: (items || []).map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: item.published_at,
        imageUrl: item.image_url,
      })),
    });
  }

  // RSS XML format
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://feedbot-production.up.railway.app";
  const feedItems = (items || [])
    .map(
      (item) => `    <item>
      <title><![CDATA[${item.title || ""}]]></title>
      <link>${escapeXml(item.url || "")}</link>
      <description><![CDATA[${item.summary || ""}]]></description>
      <source>${escapeXml(item.source || "")}</source>
      <pubDate>${item.published_at ? new Date(item.published_at).toUTCString() : ""}</pubDate>
      <guid>${escapeXml(item.url || item.id)}</guid>
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feed.name)} — FeedBot</title>
    <link>${baseUrl}/dashboard</link>
    <description>${escapeXml(feed.description || feed.query_text || "")}</description>
    <language>en-us</language>
    <lastBuildDate>${feed.last_refreshed_at ? new Date(feed.last_refreshed_at).toUTCString() : new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feeds/${id}/export?format=rss" rel="self" type="application/rss+xml"/>
${feedItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
