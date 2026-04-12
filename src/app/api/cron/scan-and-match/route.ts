import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { getServiceClient } from "@/lib/supabase";
import { scanGlobal, scanBrave, scanBraveVideos } from "@/lib/global-scanner";

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const expected = `Bearer ${cronSecret}`;
  if (!secret || secret.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
  } catch {
    return false;
  }
}

let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";

type SupabaseClient = ReturnType<typeof getServiceClient>;

async function getScanState(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await supabase.from("scan_state").select("last_scanned_at").eq("category", key).single();
  return data?.last_scanned_at ?? null;
}

async function setScanState(supabase: SupabaseClient, key: string, value: string): Promise<void> {
  await supabase.from("scan_state").upsert({ category: key, last_scanned_at: value }, { onConflict: "category" });
}

// ════════════════════════════════════════════════════════════════
// STEP 1: SCAN — fetch RSS + Brave → article_pool
// ════════════════════════════════════════════════════════════════

async function scan(supabase: SupabaseClient) {
  const results = { global: { scanned: 0, added: 0 }, brave: { scanned: 0, added: 0 }, videos: { scanned: 0, added: 0 } };

  try { results.global = await scanGlobal(); } catch (e) { console.error("Global scan failed:", e); }

  try {
    const { data: feeds } = await supabase.from("feeds").select("id, query_text, last_refreshed_at").eq("is_active", true);
    if (feeds && feeds.length > 0) {
      const sorted = [...feeds].sort((a, b) => {
        const at = (a as Record<string, unknown>).last_refreshed_at as string | null;
        const bt = (b as Record<string, unknown>).last_refreshed_at as string | null;
        if (!at && !bt) return 0; if (!at) return -1; if (!bt) return 1;
        return at.localeCompare(bt);
      });
      const queries = sorted.map(f => f.query_text).filter(Boolean).slice(0, 20);
      if (queries.length > 0) results.brave = await scanBrave(queries);
    }
  } catch (e) { console.error("Brave scan failed:", e); }

  try { results.videos = await scanBraveVideos(); } catch (e) { console.error("Video scan failed:", e); }

  return results;
}

// ════════════════════════════════════════════════════════════════
// STEP 2: CLASSIFY — give AI the articles + feed prompts → matches
// ════════════════════════════════════════════════════════════════

async function classify(supabase: SupabaseClient) {
  const client = getClient();
  if (!client) return { error: "No OpenAI API key" };

  // Get all active feeds (id + name + prompt)
  const { data: feeds } = await supabase
    .from("feeds")
    .select("id, name, query_text")
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) return { error: "No active feeds" };

  // Get new articles since last classification
  const lastClassified = await getScanState(supabase, "last_classified_at");
  const cutoff = lastClassified || new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: articles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source, url, image_url, published_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!articles || articles.length === 0) {
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return { articles: 0, matches: 0, inserted: 0 };
  }

  // Build feed list: "0:AI & ML — artificial intelligence LLM AI startups machine learning\n1:Tech — ..."
  const feedList = feeds.map((f, i) =>
    `${i}:${f.name} — ${(f.query_text || "").slice(0, 80)}`
  ).join("\n");

  // Process articles in batches of 50
  const BATCH = 50;
  const allMatches: { articleIdx: number; feedIdx: number }[] = [];
  let apiCalls = 0;

  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH);
    const articleList = batch.map((a, j) => {
      const summary = (a.summary || "").slice(0, 100);
      return `${j}|${a.title}|${summary}|${a.source}`;
    }).join("\n");

    try {
      apiCalls++;
      const response = await client.responses.create({
        model: AI_MODEL,
        input: `Here are the feeds:\n${feedList}\n\nHere are new articles:\n${articleList}\n\nFor each article, pick 1-3 feeds it belongs to. Only match if clearly relevant.`,
        text: {
          format: {
            type: "json_schema",
            name: "matches",
            strict: true,
            schema: {
              type: "object",
              properties: {
                m: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      a: { type: "number" },
                      f: { type: "array", items: { type: "number" } },
                    },
                    required: ["a", "f"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["m"],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse(response.output_text) as { m: { a: number; f: number[] }[] };
      for (const match of parsed.m) {
        if (typeof match.a !== "number" || !Array.isArray(match.f)) continue;
        if (match.a < 0 || match.a >= batch.length) continue;
        for (const fi of match.f) {
          if (typeof fi === "number" && fi >= 0 && fi < feeds.length) {
            allMatches.push({ articleIdx: i + match.a, feedIdx: fi });
          }
        }
      }
    } catch (e) {
      console.error(`Classify batch ${i} failed:`, e);
    }
  }

  // Deduplicate matches
  const seen = new Set<string>();
  const uniqueMatches = allMatches.filter(m => {
    const key = `${articles[m.articleIdx].id}::${feeds[m.feedIdx].id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Check which pairs already exist in feed_items
  const articleIds = [...new Set(uniqueMatches.map(m => articles[m.articleIdx].id))];
  const feedIds = [...new Set(uniqueMatches.map(m => feeds[m.feedIdx].id))];

  const { data: existing } = await supabase
    .from("feed_items")
    .select("article_pool_id, feed_id")
    .in("article_pool_id", articleIds.slice(0, 500))
    .in("feed_id", feedIds);

  const existingSet = new Set(
    (existing || []).map((e: { article_pool_id: string; feed_id: string }) => `${e.article_pool_id}::${e.feed_id}`)
  );

  // Build insert rows (only new pairs)
  const toInsert = uniqueMatches
    .filter(m => !existingSet.has(`${articles[m.articleIdx].id}::${feeds[m.feedIdx].id}`))
    .map(m => {
      const a = articles[m.articleIdx];
      return {
        feed_id: feeds[m.feedIdx].id,
        article_pool_id: a.id,
        title: a.title,
        url: a.url,
        summary: a.summary,
        source: a.source,
        image_url: a.image_url,
        relevance_score: 80,
        published_at: a.published_at,
      };
    });

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error } = await supabase.from("feed_items").insert(chunk);
    if (!error) inserted += chunk.length;
    else console.error(`Insert batch ${i} failed:`, error);
  }

  // Update last_refreshed_at for feeds that got new items
  const updatedFeeds = new Set(toInsert.map(r => r.feed_id));
  const now = new Date().toISOString();
  for (const feedId of updatedFeeds) {
    await supabase.from("feeds").update({ last_refreshed_at: now }).eq("id", feedId);
  }

  await setScanState(supabase, "last_classified_at", now);

  return { articles: articles.length, apiCalls, matches: uniqueMatches.length, inserted, feedsUpdated: updatedFeeds.size };
}

// ════════════════════════════════════════════════════════════════
// Route handler
// ════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phase = new URL(request.url).searchParams.get("phase") || "all";
  const supabase = getServiceClient();

  if (phase === "scan") {
    const scanResult = await scan(supabase);
    return NextResponse.json({ scan: scanResult });
  }

  if (phase === "classify") {
    const classifyResult = await classify(supabase);
    return NextResponse.json({ classify: classifyResult });
  }

  // phase=all: scan then classify
  const scanResult = await scan(supabase);
  const classifyResult = await classify(supabase);
  return NextResponse.json({ scan: scanResult, classify: classifyResult });
}
