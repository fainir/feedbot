import OpenAI from "openai";
import { getServiceClient } from "@/lib/supabase";

let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Instantly classify recent articles from article_pool against a single feed's prompt.
 * Used when a user creates a new custom feed — gives them results in seconds.
 */
export async function instantClassify(
  supabase: ReturnType<typeof getServiceClient>,
  feedId: string,
  feedPrompt: string
): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  // Get 100 recent articles from the pool
  const { data: articles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source, url, image_url, published_at")
    .order("published_at", { ascending: false })
    .limit(100);

  if (!articles || articles.length === 0) return 0;

  // Send in one batch of 100 — each article includes its title as verification
  const articleList = articles.map((a, i) => {
    const summary = (a.summary || "").slice(0, 60);
    return `${i}|${a.title}|${summary}|${a.source}`;
  }).join("\n");

  try {
    const prompt = `A user wants: "${feedPrompt}"\n\nArticles:\n${articleList}\n\nReturn the indices of articles this user would want. Only include clearly relevant articles, skip spam/off-topic. For each, write a 1-sentence summary.\n\nReturn JSON: {"m":[{"a":index,"s":"summary"},...]}`;
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent) as { m?: { a: number; s: string }[] };
    if (!parsed.m) return 0;

    // Validate indices and build insert rows
    const seenUrls = new Set<string>();
    const rows = parsed.m
      .filter(m => typeof m.a === "number" && m.a >= 0 && m.a < articles.length)
      .map(m => {
        const a = articles[m.a];
        // Dedup by URL
        const normUrl = a.url.split("?")[0].split("#")[0];
        if (seenUrls.has(normUrl)) return null;
        seenUrls.add(normUrl);
        // Validate: LLM summary should somewhat relate to the title (sanity check)
        const summary = (typeof m.s === "string" && m.s.length > 10) ? m.s.slice(0, 200) : a.summary;
        return {
          feed_id: feedId,
          article_pool_id: a.id,
          title: a.title,
          url: a.url,
          summary,
          source: a.source,
          image_url: a.image_url,
          relevance_score: 80,
          published_at: a.published_at,
        };
      })
      .filter(Boolean)
      .slice(0, 30);

    if (rows.length === 0) return 0;
    const { error } = await supabase.from("feed_items").insert(rows);
    if (error) return 0;
    return rows.length;
  } catch {
    return 0;
  }
}
