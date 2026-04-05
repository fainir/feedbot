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
  scoring_criteria?: string;
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

IMPORTANT — Think about what the user ACTUALLY means:
- Expand the topic: what subtopics, related fields, key players, and terminology would a knowledgeable person include?
- Be specific: "AI safety" means alignment research, RLHF, Constitutional AI, governance, not just any article mentioning "AI" and "safe"
- Include_terms should be DOMAIN-SPECIFIC, not generic words like "research", "study", "news", "latest"
- Exclude_terms should block the most common false positives for this topic

Return this exact JSON structure:
{
  "google_queries": ["3-5 specific Google News search queries — use domain terminology, not generic phrases"],
  "subreddits": ["3-5 most relevant subreddit names, without the r/ prefix"],
  "hn_queries": ["2-3 Hacker News search terms"],
  "medium_tags": ["2-3 Medium tags (lowercase, hyphenated)"],
  "devto_tags": ["2-3 Dev.to tags (lowercase)"],
  "include_terms": ["8-15 DOMAIN-SPECIFIC keywords/phrases — terms a specialist would use, NOT generic words like 'research' or 'study'"],
  "exclude_terms": ["5-8 terms that indicate an article is NOT about this topic — think about the most common false positives"],
  "quality_guidance": "2-3 sentences: What makes a GREAT article for this feed? What specific signals indicate quality vs noise? What domains/topics should be EXCLUDED even if they share keywords?",
  "scoring_criteria": "One paragraph telling a scorer how to judge articles for THIS specific feed. What counts as 85+? What's a common trap that looks relevant but isn't? What sources are most trustworthy for this topic?"
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
