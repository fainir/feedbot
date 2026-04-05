import Anthropic from "@anthropic-ai/sdk";
import type { SearchPlan } from "@/lib/prompt-intelligence";
import { getSourceBoost } from "@/lib/global-scanner";

/**
 * Detect the primary script/language family of a text.
 * Returns: "latin" (English/European), "hebrew", "arabic", "cjk" (Chinese/Japanese/Korean), "cyrillic", "mixed"
 */
function detectLanguageScript(text: string): string {
  if (!text || text.length < 3) return "mixed";
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const cjk = (text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g) || []).length;
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const total = text.replace(/[\s\d.,!?'":\-()[\]{}@#$%&*+=/\\|<>~`^_]/g, "").length || 1;
  const scores = { latin: latin / total, hebrew: hebrew / total, arabic: arabic / total, cjk: cjk / total, cyrillic: cyrillic / total };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0.4 ? best[0] : "mixed";
}

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

export interface FeedbackHint {
  likedSources: string[];   // sources user likes (from reactions)
  dislikedSources: string[]; // sources user dislikes
  likedTopics: string[];     // keywords from liked article titles
  dislikedTopics: string[];  // keywords from disliked article titles
}

/**
 * Full scoring pipeline:
 * 1. Pre-filter with search plan's include/exclude terms (free)
 * 2. AI score survivors with quality guidance (Haiku, cheap)
 * 3. Apply source quality boost + user feedback adjustment
 * 4. Return only high-quality matches (70+)
 */
export async function scoreArticles(
  feedPrompt: string,
  articles: PoolArticle[],
  plan?: SearchPlan | null,
  feedback?: FeedbackHint | null
): Promise<ScoredArticle[]> {
  if (articles.length === 0) return [];

  if (!getClient()) {
    return keywordScore(feedPrompt, articles, plan);
  }

  const BATCH_SIZE = 100;
  const results: ScoredArticle[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchResults = await scoreBatch(feedPrompt, batch, plan, feedback);
    results.push(...batchResults);
  }

  // Apply source quality boost + user feedback adjustment
  for (const result of results) {
    const article = articles.find((a) => a.id === result.id);
    if (article) {
      const boost = getSourceBoost(article.source);
      result.score = Math.min(100, result.score + boost);

      // User feedback adjustment
      if (feedback) {
        const srcLower = article.source.toLowerCase();
        if (feedback.likedSources.some((s) => srcLower.includes(s))) {
          result.score = Math.min(100, result.score + 5);
        }
        if (feedback.dislikedSources.some((s) => srcLower.includes(s))) {
          result.score = Math.max(0, result.score - 10);
        }
      }
    }
  }

  return results;
}

async function scoreBatch(
  feedPrompt: string,
  articles: PoolArticle[],
  plan?: SearchPlan | null,
  feedback?: FeedbackHint | null
): Promise<ScoredArticle[]> {
  const articleList = articles
    .map((a, i) => {
      const summary = a.summary?.slice(0, 200) || "";
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

  // Per-feed scoring criteria — domain-specific judgment instructions
  const scoringNote = plan?.scoring_criteria
    ? `\nFEED-SPECIFIC SCORING: ${plan.scoring_criteria}`
    : "";

  const feedbackNote = feedback?.likedTopics?.length || feedback?.dislikedTopics?.length
    ? `\nUSER PREFERENCES (from past reactions):` +
      (feedback.likedTopics.length ? `\n- User LIKES articles about: ${feedback.likedTopics.join(", ")}` : "") +
      (feedback.dislikedTopics.length ? `\n- User DISLIKES articles about: ${feedback.dislikedTopics.join(", ")}` : "")
    : "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Score each article 0-100 for this feed. Be STRICT — only truly relevant articles score high.

FEED: "${feedPrompt}"${qualityNote}${excludeNote}${scoringNote}${feedbackNote}

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
- UX/UI design articles are NOT science — score 0 for science feeds
- Brand case studies are NOT science or tech news — score 0
- Promotional agency/service posts ("hire us", "pricing guide") — score 0
- Articles about a topic USING AI are not AI articles (e.g. "AI in agriculture" is agriculture, not AI)
- Space/NASA articles are NOT AI/ML — score 0 for AI feeds
- Finance/investment analysis is NOT science — score 0 for science feeds
- AppSec/OWASP security articles are NOT science or AI — score 0 for those feeds

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

// Spam/SEO patterns that should never pass pre-filter
const SPAM_PATTERNS = [
  /\bagency\b.*\b(dubai|india|pakistan|uae)\b/i,
  /\b(dubai|uae)\b.*\b(gifts?|pricing|cost|guide)\b/i,
  /\bwebsite\s+(design|development)\s+(cost|pricing|agency)\b/i,
  /\bgrow your\s+(online\s+)?business\b/i,
  /\bcorporate gifts?\b/i,
  /\bhire\s+(a\s+)?(developer|team|agency)\b/i,
  /\b(mock test|free certificate|get certified)\b/i,
  /\btrusted\s+(ecommerce|web|digital)\s+(development\s+)?agency\b/i,
];

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

    // Spam/SEO filter — reject promotional content
    if (SPAM_PATTERNS.some((p) => p.test(text))) return false;

    // Article quality signal — reject stubs with no substance
    const summaryLen = (article.summary || "").trim().length;
    const titleLen = (article.title || "").trim().length;
    if (summaryLen < 30 && titleLen < 30) return false; // no content at all

    // Language filter — match article language to prompt language
    const title = article.title || "";
    const promptLang = detectLanguageScript(feedPrompt);
    const titleLang = detectLanguageScript(title);
    // If prompt is Latin-script (English/European), reject non-Latin articles
    // If prompt is Hebrew/Arabic, reject Latin articles
    // If prompt is CJK, reject non-CJK articles
    if (promptLang !== titleLang && promptLang !== "mixed" && titleLang !== "mixed") return false;

    // Hard exclude
    if (excludeTerms.some((term) => text.includes(term))) return false;

    // Count matching include terms
    const matchCount = includeTerms.filter((term) => text.includes(term)).length;

    // Generic sources (DEV, Medium) need stronger match — at least 2 terms
    // Trusted sources (Nature, NASA, SpaceNews) pass with 1 term
    const srcLower = (article.source || "").toLowerCase();
    const isGenericSource = srcLower.includes("dev community") || srcLower.includes("medium") || srcLower.includes("google");
    const minMatches = isGenericSource ? 2 : 1;

    return matchCount >= minMatches;
  });
}
