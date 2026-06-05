/**
 * Shared content-quality helpers. Used at ingest (classify) to reject junk
 * before it enters feed_items, and at serve time (feed APIs) to filter junk
 * already stored + normalize summaries. Pure functions — safe everywhere.
 *
 * Surfaced by the 2026-06-02 QA: low-effort SEO/AI content-farms and crypto
 * "recovery" scams were leaking through, *.medium.com subdomains were each
 * consuming the per-source diversity quota, and classifier rationale was
 * bleeding into user-facing summaries.
 */

// SEO / AI-spun content farms and low-value aggregators caught in QA. Matched
// against "source url" so it catches both the display name and the domain.
const JUNK_SOURCE_RE =
  /\b(venezart|seositestool|gitnux|gitnexa|teamofkeys|thefounders\.group|newsbeep|alpha-maven)\b/i;

// Crypto "recover your stolen funds / hire-a-hacker" scams — these posts are
// themselves the scam. Tightly scoped (requires the "from scammers/hackers" or
// "recovery service/expert" framing) so legit news like "SEC recovers crypto
// in fraud case" or "Police recover stolen bitcoin" is NOT filtered.
const SCAM_TITLE_RE =
  /\brecover(?:ing|ed)?\s+(?:your\s+|my\s+|lost\s+|stolen\s+|back\s+)*(?:bitcoin|btc|crypto|ethereum|eth|usdt|funds?|coins?|money|wallet|investment)\b[^.]{0,30}\b(?:from\s+(?:a\s+)?(?:scam|scammer|hacker|fraud)|scammers?|hackers?)\b|\bhire\s+a\s+(?:hacker|recovery\s+expert)\b|\bcrypto\s+recovery\s+(?:expert|service|agency|specialist|company|agent)\b|\b(?:lost|stolen)\s+(?:bitcoin|crypto|funds?|coins?)\s+recovery\b/i;

/** True if an item should be dropped on quality grounds (junk source or scam). */
export function isLowQualityItem(title = "", source = "", url = ""): boolean {
  const src = `${source || ""} ${url || ""}`;
  if (JUNK_SOURCE_RE.test(src)) return true;
  if (SCAM_TITLE_RE.test(title || "")) return true;
  return false;
}

/**
 * Collapse a source to a canonical key for per-source diversity capping, so
 * subdomains (weglow.medium.com, cryptotaxaudit.medium.com, medium.com) can't
 * each consume the quota and let one platform dominate a feed.
 */
export function sourceKey(source = ""): string {
  const s = (source || "").toLowerCase();
  if (s.includes("medium")) return "medium";
  if (s.includes("dev community") || s.includes("dev.to")) return "devto";
  if (s.includes("reddit") || /\br\//.test(s)) return "reddit";
  if (s.includes("substack")) return "substack";
  if (s.includes("youtube") || s.includes("youtu.be")) return "youtube";
  if (s.includes("google")) return "google-news";
  // Fall back to the registrable-ish domain (last two labels).
  const domain = s.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const parts = domain.split(".").filter(Boolean);
  return (parts.length >= 2 ? parts.slice(-2).join(".") : domain || s).slice(0, 24);
}

const SUMMARY_META_RE =
  /\b(the feed|this feed|fitting (?:well|nicely|neatly|in)|fits? (?:well|nicely|neatly|in)|relevant to (?:this|the) (?:feed|topic)|dedicated to (?:the|this)|aligns? (?:well )?with (?:the|this)|making it (?:a )?(?:great|good|perfect|ideal) (?:fit|match) for|catering to|tailored (?:to|for) (?:the|this)|suitable for (?:this|the) (?:feed|reader))\b/i;

/**
 * Strip classifier rationale that leaked into a summary (e.g. "…, fitting well
 * with the feed dedicated to health research."). Drops a trailing meta-clause
 * while leaving the article description intact.
 */
export function sanitizeSummary(summary = ""): string {
  let s = (summary || "").trim();
  if (!s) return s;
  // Drop the trailing clause after the last comma if it's match-rationale.
  const ci = s.lastIndexOf(",");
  if (ci > 24 && SUMMARY_META_RE.test(s.slice(ci + 1))) s = s.slice(0, ci).trim();
  // Drop a trailing standalone meta sentence (no comma form).
  s = s.replace(/\s*[—–-]?\s*[^.?!,]*\b(the feed|this feed|fitting (?:well|nicely)|fits? (?:well|nicely))\b[^.?!]*[.?!]?\s*$/i, "").trim();
  s = s.replace(/[\s,;:—–-]+$/, "").trim();
  if (s && !/[.?!]$/.test(s)) s += ".";
  return s;
}
