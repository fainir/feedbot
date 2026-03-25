import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { discoverFeeds } from "@/lib/feed-engine";
import { canCreateFeed } from "@/lib/usage";

interface ParsedFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
}

function parseOPML(xml: string): ParsedFeed[] {
  const feeds: ParsedFeed[] = [];
  // Match <outline> elements with xmlUrl attribute (RSS feeds)
  const outlineRegex = /<outline[^>]*?xmlUrl\s*=\s*"([^"]*)"[^>]*?>/gi;
  let match;

  while ((match = outlineRegex.exec(xml)) !== null) {
    const fullTag = match[0];
    const xmlUrl = match[1];

    // Extract title or text attribute
    const titleMatch = fullTag.match(/(?:title|text)\s*=\s*"([^"]*)"/i);
    const htmlUrlMatch = fullTag.match(/htmlUrl\s*=\s*"([^"]*)"/i);

    feeds.push({
      title: titleMatch?.[1] || xmlUrl,
      xmlUrl,
      htmlUrl: htmlUrlMatch?.[1],
    });
  }

  return feeds;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  let opmlText: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    opmlText = await file.text();
  } else {
    opmlText = await request.text();
  }

  if (!opmlText.includes("<outline") && !opmlText.includes("<opml")) {
    return NextResponse.json(
      { error: "Invalid OPML file" },
      { status: 400 }
    );
  }

  const parsed = parseOPML(opmlText);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No feeds found in OPML file" },
      { status: 400 }
    );
  }

  // Limit to 20 feeds per import
  const feedsToImport = parsed.slice(0, 20);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const feed of feedsToImport) {
    // Check plan limits before creating
    const allowed = await canCreateFeed(user.id);
    if (!allowed) {
      skipped.push(feed.title);
      continue;
    }

    // Check if feed with same name already exists
    const { data: existing } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", feed.title)
      .single();

    if (existing) {
      skipped.push(feed.title);
      continue;
    }

    // Create the feed — use the feed title as the query for content discovery
    const queryText = feed.title;
    const { data: newFeed, error } = await supabase
      .from("feeds")
      .insert({
        user_id: user.id,
        name: feed.title,
        description: `Imported from ${feed.xmlUrl}`,
        query_text: queryText,
        schedule: "daily",
        notify_email: false,
        notify_push: false,
        notify_whatsapp: false,
        is_active: true,
        last_refreshed_at: null,
      })
      .select()
      .single();

    if (error || !newFeed) {
      skipped.push(feed.title);
      continue;
    }

    created.push(feed.title);

    // Background: discover initial items (don't block the response)
    discoverFeeds(queryText)
      .then(async (items) => {
        if (items.length > 0) {
          const rows = items.map((item) => ({
            feed_id: newFeed.id,
            title: item.title,
            url: item.url,
            summary: item.summary,
            source: item.source,
            image_url: item.image_url,
            published_at: item.published_at,
          }));
          await getServiceClient().from("feed_items").insert(rows);
          await supabase
            .from("feeds")
            .update({ last_refreshed_at: new Date().toISOString() })
            .eq("id", newFeed.id);
        }
      })
      .catch(() => {});
  }

  return NextResponse.json({
    imported: created.length,
    skipped: skipped.length,
    total: parsed.length,
    created,
    skipped_names: skipped,
  });
}
