import Anthropic from "@anthropic-ai/sdk";

/**
 * The search plan generated from a user's feed prompt.
 * Stored in the feed record and reused every scan cycle.
 */
export interface SearchPlan {
  google_queries: string[];
  subreddits: string[];
  hn_queries: string[];
  medium_tags: string[];
  devto_tags: string[];
  include_terms: string[];
  exclude_terms: string[];
  quality_guidance: string;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Generate an optimized search plan from a user's feed prompt.
 * Called ONCE when a feed is created or edited, then cached in the DB.
 * Cost: ~$0.003 per call (Haiku).
 */
export async function generateSearchPlan(prompt: string): Promise<SearchPlan> {
  const client = getClient();

  if (!client) {
    return fallbackSearchPlan(prompt);
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate a search plan to find the best articles matching this feed description. Return ONLY valid JSON.

FEED: "${prompt}"

Return this exact JSON structure:
{
  "google_queries": ["2-4 specific Google News search queries that would find the best articles for this topic"],
  "subreddits": ["3-5 most relevant subreddit names like r/programming, without the r/ prefix"],
  "hn_queries": ["1-3 Hacker News search terms"],
  "medium_tags": ["2-3 Medium tags (lowercase, hyphenated)"],
  "devto_tags": ["2-3 Dev.to tags (lowercase)"],
  "include_terms": ["5-10 keywords that relevant articles MUST contain at least one of"],
  "exclude_terms": ["3-5 keywords that indicate an article is NOT relevant"],
  "quality_guidance": "One sentence describing what makes a GREAT article for this feed vs a mediocre one"
}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackSearchPlan(prompt);

    const plan = JSON.parse(jsonMatch[0]) as SearchPlan;

    // Validate structure
    if (!plan.google_queries?.length || !plan.include_terms?.length) {
      return fallbackSearchPlan(prompt);
    }

    return plan;
  } catch (err) {
    console.error("Search plan generation failed:", err);
    return fallbackSearchPlan(prompt);
  }
}

/**
 * Fallback: generate a basic search plan from keywords when AI is unavailable.
 */
function fallbackSearchPlan(prompt: string): SearchPlan {
  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const topTerms = words.slice(0, 5);
  const query = topTerms.join(" ");

  return {
    google_queries: [query, topTerms.slice(0, 3).join(" ") + " news"],
    subreddits: [],
    hn_queries: [topTerms.slice(0, 2).join(" ")],
    medium_tags: [topTerms.slice(0, 2).join("-")],
    devto_tags: [topTerms[0] || "technology"],
    include_terms: topTerms,
    exclude_terms: [],
    quality_guidance: `Articles should be directly about ${query}`,
  };
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "about",
  "latest", "recent", "new", "news", "updates", "show", "find", "get",
  "best", "top", "all", "any", "like", "want", "follow", "give", "me",
  "my", "i", "we", "our", "you", "your", "that", "this", "these",
]);
