import Anthropic from "@anthropic-ai/sdk";
import type { SearchPlan } from "@/lib/prompt-intelligence";
import { getSourceBoost } from "@/lib/global-scanner";

interface PoolArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
}

interface ScoredArticle {
  id: string;
  score: number;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Full scoring pipeline:
 * 1. Pre-filter with search plan's include/exclude terms (free)
 * 2. AI score survivors with quality guidance (Haiku, cheap)
 * 3. Apply source quality boost
 * 4. Return only high-quality matches (70+)
 */
export async function scoreArticles(
  feedPrompt: string,
  articles: PoolArticle[],
  plan?: SearchPlan | null
): Promise<ScoredArticle[]> {
  if (articles.length === 0) return [];

  if (!getClient()) {
    return keywordScore(feedPrompt, articles, plan);
  }

  const BATCH_SIZE = 50;
  const results: ScoredArticle[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchResults = await scoreBatch(feedPrompt, batch, plan);
    results.push(...batchResults);
  }

  // Apply source quality boost
  for (const result of results) {
    const article = articles.find((a) => a.id === result.id);
    if (article) {
      const boost = getSourceBoost(article.source);
      result.score = Math.min(100, result.score + boost);
    }
  }

  return results;
}

async function scoreBatch(
  feedPrompt: string,
  articles: PoolArticle[],
  plan?: SearchPlan | null
): Promise<ScoredArticle[]> {
  const articleList = articles
    .map((a, i) => {
      const summary = a.summary?.slice(0, 120) || "";
      return summary ? `${i}|${a.title}|${a.source}|${summary}` : `${i}|${a.title}|${a.source}`;
    })
    .join("\n");

  const client = getClient();
  if (!client) return articles.map((a) => ({ id: a.id, score: 50 }));

  const qualityNote = plan?.quality_guidance
    ? `\nQUALITY: ${plan.quality_guidance}`
    : "";

  const excludeNote = plan?.exclude_terms?.length
    ? `\nEXCLUDE topics about: ${plan.exclude_terms.join(", ")}`
    : "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Score each article 0-100 for this feed. Be STRICT — only truly relevant articles score high.

FEED: "${feedPrompt}"${qualityNote}${excludeNote}

FORMAT: index|title|source|summary (summary may be absent)

STRICT RULES:
- 85-100: Article's PRIMARY topic matches the feed. Must be ABOUT this topic, not just mention a keyword. Use the summary to verify depth.
- 70-84: Clearly related, would genuinely interest a follower of this topic
- 40-69: Mentions a keyword but is about something else — REJECT
- 0-39: Completely unrelated

COMMON TRAPS (score LOW):
- "Technology Networks" is a BIOLOGY/MEDICAL publisher — score 0 for tech feeds
- "Washington Technology" is gov procurement — score 0 for consumer tech
- "Carwash technology" is NOT tech news — score 0
- EV cars are NOT AI/ML news even if AI mentioned — score 20
- Cybersecurity breach is NOT AI/ML — score 10 for AI feeds
- Company hiring/HR announcements are NOT industry news — score 10
- Generic "how technology changed X" essays are NOT tech news — score 20
- Listicles and spam-like "Top 10" with no substance — score 30
- Duplicate/repost of same story from different source — score lower for weaker source

ARTICLES:
${articleList}

JSON array only: [score0, score1, ...]`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\d,\s]+\]/);
    if (!match) return articles.map((a) => ({ id: a.id, score: 50 }));

    const scores: number[] = JSON.parse(match[0]);
    return articles.map((a, i) => ({
      id: a.id,
      score: Math.min(100, Math.max(0, scores[i] ?? 50)),
    }));
  } catch (err) {
    console.error("AI scoring failed:", err);
    return articles.map((a) => ({ id: a.id, score: 50 }));
  }
}

/**
 * Keyword fallback when AI unavailable. Uses search plan if available.
 */
function keywordScore(
  feedPrompt: string,
  articles: PoolArticle[],
  plan?: SearchPlan | null
): ScoredArticle[] {
  const includeTerms = plan?.include_terms?.length
    ? plan.include_terms
    : feedPrompt
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

  const excludeTerms = new Set(plan?.exclude_terms?.map((t) => t.toLowerCase()) || []);

  if (includeTerms.length === 0) return articles.map((a) => ({ id: a.id, score: 50 }));

  return articles.map((article) => {
    const text = `${article.title} ${article.summary}`.toLowerCase();

    // Penalize excluded terms
    if (excludeTerms.size > 0) {
      for (const term of excludeTerms) {
        if (text.includes(term)) return { id: article.id, score: 10 };
      }
    }

    const matches = includeTerms.filter((word) => text.includes(word.toLowerCase())).length;
    const baseScore = Math.round((matches / includeTerms.length) * 100);
    const boost = getSourceBoost(article.source);
    return { id: article.id, score: Math.min(100, baseScore + boost) };
  });
}

/**
 * Smart pre-filter using search plan. Removes obviously irrelevant articles
 * before sending to AI, reducing token cost by ~80%.
 */
export function preFilterArticles(
  feedPrompt: string,
  articles: PoolArticle[],
  plan?: SearchPlan | null
): PoolArticle[] {
  const includeTerms = plan?.include_terms?.length
    ? plan.include_terms.map((t) => t.toLowerCase())
    : feedPrompt
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

  const excludeTerms = (plan?.exclude_terms || []).map((t) => t.toLowerCase());

  if (includeTerms.length === 0) return articles;

  return articles.filter((article) => {
    const text = `${article.title} ${article.summary}`.toLowerCase();

    // Hard exclude
    if (excludeTerms.some((term) => text.includes(term))) return false;

    // Require at least 1 include term
    return includeTerms.some((term) => text.includes(term));
  });
}
