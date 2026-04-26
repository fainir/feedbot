import OpenAI from "openai";
import type { getServiceClient } from "@/lib/supabase";

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export interface ArticleInput {
  id?: string; // article_pool_id if available
  title: string;
  url: string;
  summary?: string | null;
  source?: string | null;
  image_url?: string | null;
  published_at?: string | null;
}

export interface FeedInput {
  id: string;
  name: string;
  query_text?: string | null;
}

export interface ClassifyResult {
  matches: number;
  inserted: number;
}

const CLASSIFY_PROMPT = (feedList: string, articleList: string) => `\
You are matching news articles to reader feeds. Return JSON only.

FEEDS (index: description):
${feedList}

ARTICLES (index|title|summary|source):
${articleList}

For each article, find the 1-2 feeds it best fits. Be STRICT — only include if clearly relevant.

SCORING:
- 85-100: Article's PRIMARY topic matches the feed. It IS about this topic, not just mentions it.
- 65-84: Clearly relevant, a follower of this topic would genuinely want this.
- Below 65: SKIP — tangential mention, off-topic, or background context only.

RULES:
- Assign to at most 1 feed unless the article is genuinely cross-topic (e.g. AI + security).
- Reddit posts (reddit.com/r/*/comments/): cap score at 55 — discussions are not primary sources.
- Listicles ("Top 10…", "Best X for…"), agency promotions, tutorials with no news value: cap at 50.
- "Company uses AI for X" → that's an X article, not an AI article. Score 0 for AI feeds.
- Skip: spam, ads, non-English content, generic opinion pieces with no new information.

Return JSON: {"m":[{"a":articleIndex,"f":[feedIndex],"q":qualityScore0to100,"s":"one sentence summary"},...]}`;

/**
 * Classify articles against feeds using AI, then insert matched items to feed_items.
 * Used by every ingestion path: cron scan, per-feed refresh, and new feed creation.
 */
export async function classifyAndInsert(
  articles: ArticleInput[],
  feeds: FeedInput[],
  supabase: ReturnType<typeof getServiceClient>
): Promise<ClassifyResult> {
  if (articles.length === 0 || feeds.length === 0) return { matches: 0, inserted: 0 };

  const client = getClient();
  if (!client) return { matches: 0, inserted: 0 };

  const feedList = feeds.map((f, i) => `${i}: "${f.query_text || f.name}"`).join("\n");

  // 25 articles/batch — keeps the prompt + response well under the
  // memory ceiling on Railway. Larger batches were OOMing during classify.
  const BATCH = 25;
  const allMatches: { articleIdx: number; feedIdx: number; quality: number; summary: string }[] = [];

  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH);
    const articleList = batch
      .map((a, j) => `${j}|${a.title}|${(a.summary || "").slice(0, 80)}|${a.source || ""}`)
      .join("\n");

    try {
      const response = await client.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: CLASSIFY_PROMPT(feedList, articleList) }],
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) continue;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as {
        m?: { a: number; f: number[]; q: number; s: string }[];
      };

      for (const match of parsed.m || []) {
        if (typeof match.a !== "number" || !Array.isArray(match.f)) continue;
        if (match.a < 0 || match.a >= batch.length) continue;
        const quality = typeof match.q === "number" ? match.q : 0;
        if (quality < 65) continue;
        const summary =
          typeof match.s === "string" && match.s.length > 10 ? match.s.slice(0, 200) : "";
        for (const fi of match.f) {
          if (typeof fi === "number" && fi >= 0 && fi < feeds.length) {
            allMatches.push({ articleIdx: i + match.a, feedIdx: fi, quality, summary });
          }
        }
      }
    } catch {
      // continue to next batch
    }
    if (typeof global !== "undefined" && (global as { gc?: () => void }).gc) {
      (global as { gc: () => void }).gc();
    }
  }

  // Keep highest quality per article-feed pair
  const bestByKey = new Map<string, (typeof allMatches)[0]>();
  for (const m of allMatches) {
    const key = `${articles[m.articleIdx].url}::${feeds[m.feedIdx].id}`;
    const existing = bestByKey.get(key);
    if (!existing || m.quality > existing.quality) bestByKey.set(key, m);
  }

  const toInsert = [...bestByKey.values()].map((m) => {
    const a = articles[m.articleIdx];
    return {
      feed_id: feeds[m.feedIdx].id,
      article_pool_id: a.id ?? null,
      title: a.title,
      url: a.url,
      summary: m.summary || a.summary || "",
      source: a.source || "",
      image_url: a.image_url ?? null,
      relevance_score: m.quality,
      published_at: a.published_at || new Date().toISOString(),
    };
  });

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error } = await supabase
      .from("feed_items")
      .upsert(chunk, { onConflict: "feed_id,url", ignoreDuplicates: true });
    if (!error) inserted += chunk.length;
  }

  return { matches: allMatches.length, inserted };
}
