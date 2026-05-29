import type { getServiceClient } from "@/lib/supabase";
import { embedTexts, toVectorLiteral } from "@/lib/embeddings";

// Product SLO: each feed surfaces up to this many relevant posts, drawn
// from the last RECENCY_DAYS, ranked freshest-first among the most-relevant.
const TARGET_POSTS = 60;
const RECENCY_DAYS = 7;
// Cosine-similarity floor. Below this we'd be padding a feed with
// off-topic content — better to show fewer, relevant posts. Calibrated
// against text-embedding-3-small @ 512d on the live pool: genuinely
// on-topic articles land ~0.40–0.67 (Quantum Computing 0.52–0.67, Oceans
// 0.40–0.53), tangential/noise sits below ~0.38. 0.40 separates them
// while keeping niche feeds reasonably full.
const MIN_SIMILARITY = 0.4;
const CANDIDATES = 250; // HNSW pulls this many most-similar, then we recency-rank

type SupabaseClient = ReturnType<typeof getServiceClient>;

export interface FillResult {
  feeds: number;
  embeddedPrompts: number;
  inserted: number;
}

/**
 * Fill feeds by PULLING their most-relevant recent articles from the shared
 * pool via vector search — the core product mechanism. Works for any prompt
 * (system feed or arbitrary user feed) with no per-feed special-casing.
 *
 * Keeps feed_items as the serving + interaction table (reactions/bookmarks
 * FK to it), so this only changes how it's populated, not the read path.
 */
export async function fillFeeds(
  supabase: SupabaseClient,
  opts?: { feedIds?: string[] },
): Promise<FillResult> {
  let q = supabase
    .from("feeds")
    .select("id, name, query_text, embedding")
    .eq("is_active", true);
  if (opts?.feedIds && opts.feedIds.length > 0) q = q.in("id", opts.feedIds);
  const { data: feeds } = await q;
  if (!feeds || feeds.length === 0) return { feeds: 0, embeddedPrompts: 0, inserted: 0 };

  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 3600_000).toISOString();

  // Cache prompt embeddings on the feed row; compute any that are missing.
  const needEmbed = feeds.filter((f) => !f.embedding);
  const promptEmbedding = new Map<string, string>(); // feedId -> vector literal
  let embeddedPrompts = 0;
  if (needEmbed.length > 0) {
    const vecs = await embedTexts(needEmbed.map((f) => f.query_text || f.name));
    if (vecs) {
      for (let i = 0; i < needEmbed.length; i++) {
        const lit = toVectorLiteral(vecs[i]);
        promptEmbedding.set(needEmbed[i].id, lit);
        await supabase.from("feeds").update({ embedding: lit }).eq("id", needEmbed[i].id);
      }
      embeddedPrompts = needEmbed.length;
    }
  }

  let inserted = 0;
  let filledFeeds = 0;
  for (const f of feeds) {
    // DB returns vector as a "[...]" string; reuse it directly. Newly
    // embedded prompts use the literal we just computed.
    const emb = promptEmbedding.get(f.id) ?? (f.embedding as unknown as string | null);
    if (!emb) continue; // embeddings unavailable for this feed — skip

    const { data: matches, error } = await supabase.rpc("match_feed_articles", {
      p_embedding: emb,
      p_since: since,
      p_min_similarity: MIN_SIMILARITY,
      p_candidates: CANDIDATES,
      p_limit: TARGET_POSTS,
    });
    if (error || !matches || matches.length === 0) continue;

    const rows = (matches as Array<{
      id: string;
      title: string;
      url: string;
      summary: string | null;
      source: string | null;
      image_url: string | null;
      published_at: string;
      similarity: number;
    }>).map((m) => ({
      feed_id: f.id,
      article_pool_id: m.id,
      title: m.title,
      url: m.url,
      summary: m.summary || "",
      source: m.source || "",
      image_url: m.image_url ?? null,
      relevance_score: Math.round(m.similarity * 100),
      published_at: m.published_at,
    }));

    // Dedup by (feed_id, url); existing items stay (reactions/bookmarks safe).
    const { error: upErr } = await supabase
      .from("feed_items")
      .upsert(rows, { onConflict: "feed_id,url", ignoreDuplicates: true });
    if (!upErr) {
      inserted += rows.length;
      filledFeeds++;
    }
  }

  return { feeds: filledFeeds, embeddedPrompts, inserted };
}
