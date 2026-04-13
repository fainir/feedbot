import OpenAI from "openai";
import { getServiceClient } from "@/lib/supabase";

let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";

/**
 * Instantly classify recent articles from article_pool against a single feed's prompt.
 * Used when a user creates a new custom feed — gives them results in seconds, not 15 min.
 *
 * Returns number of articles inserted.
 */
export async function instantClassify(
  supabase: ReturnType<typeof getServiceClient>,
  feedId: string,
  feedPrompt: string
): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  // Get 200 recent articles from the pool
  const { data: articles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source, url, image_url, published_at")
    .order("published_at", { ascending: false })
    .limit(200);

  if (!articles || articles.length === 0) return 0;

  const articleList = articles.map((a, i) => {
    const summary = (a.summary || "").slice(0, 80);
    return `${i}|${a.title}|${summary}|${a.source}`;
  }).join("\n");

  try {
    const response = await client.responses.create({
      model: AI_MODEL,
      input: `A user created a feed with this description: "${feedPrompt}"\n\nHere are recent articles:\n${articleList}\n\nPick the 20-30 best articles this user would want to read. Rate quality 1-10 and write a clean 1-sentence summary for each.\n\nSkip: spam, ads, non-English, low-quality, off-topic.`,
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
                    q: { type: "number" },
                    s: { type: "string" },
                  },
                  required: ["a", "q", "s"],
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

    const parsed = JSON.parse(response.output_text) as { m: { a: number; q: number; s: string }[] };
    const matches = parsed.m
      .filter(m => typeof m.a === "number" && m.a >= 0 && m.a < articles.length && (m.q || 0) >= 6)
      .slice(0, 30);

    if (matches.length === 0) return 0;

    const rows = matches.map(m => {
      const a = articles[m.a];
      return {
        feed_id: feedId,
        article_pool_id: a.id,
        title: a.title,
        url: a.url,
        summary: (m.s && m.s.length > 10) ? m.s.slice(0, 200) : a.summary,
        source: a.source,
        image_url: a.image_url,
        relevance_score: (m.q || 7) * 10,
        published_at: a.published_at,
      };
    });

    const { error } = await supabase.from("feed_items").insert(rows);
    if (error) return 0;
    return rows.length;
  } catch {
    return 0;
  }
}
