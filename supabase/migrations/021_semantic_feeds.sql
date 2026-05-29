-- Semantic feed retrieval — the core product mechanism.
--
-- Problem with the old model: every scanned article was PUSHED through an
-- LLM against all ~122 feeds, landing only where it scored >= 65 for "at
-- most 1 feed". That structurally starves (a) niche feeds, (b) umbrella
-- feeds that lose to specific siblings, and (c) ANY arbitrary user prompt
-- — which is the entire point of the product. We patched it with per-feed
-- umbrella hacks; that doesn't generalize.
--
-- New model: PULL. Each feed (system or user) is a prompt embedding. To
-- fill it we vector-search the shared article pool for the most relevant
-- recent articles. Works for any prompt, needs no per-feed special-casing,
-- and costs less than the per-article LLM classify it replaces.
--
-- 512-dim text-embedding-3-small: ~1/3 the storage/compute of 1536 with
-- negligible retrieval-quality loss — the cost-effective choice at our
-- row counts.

create extension if not exists vector;

alter table public.article_pool add column if not exists embedding vector(512);
-- Cached prompt embedding per feed so we don't re-embed the prompt every
-- fill. Recomputed (in app) whenever it's null.
alter table public.feeds add column if not exists embedding vector(512);

-- HNSW index for fast ORDER BY embedding <=> query. Cosine ops to match
-- the normalized embeddings OpenAI returns. Built on the (initially mostly
-- NULL) column — HNSW fills incrementally as embeddings populate.
create index if not exists idx_article_pool_embedding_hnsw
  on public.article_pool using hnsw (embedding vector_cosine_ops);

-- Retrieval RPC: the K most-similar recent articles for a feed, then the
-- freshest of those above a relevance floor. Two-stage so HNSW accelerates
-- the similarity search (p_candidates) and we still surface fresh content
-- (final ORDER BY published_at) instead of stale-but-similar.
create or replace function public.match_feed_articles(
  p_embedding vector(512),
  p_since timestamptz,
  p_min_similarity double precision default 0.30,
  p_candidates integer default 200,
  p_limit integer default 60
)
returns table (
  id uuid,
  title text,
  url text,
  summary text,
  source text,
  image_url text,
  published_at timestamptz,
  similarity double precision
)
language sql
stable
as $$
  with top as (
    select a.id, a.title, a.url, a.summary, a.source, a.image_url, a.published_at,
           1 - (a.embedding <=> p_embedding) as similarity
    from public.article_pool a
    where a.embedding is not null
      and a.published_at >= p_since
    order by a.embedding <=> p_embedding
    limit p_candidates
  )
  select * from top
  where similarity >= p_min_similarity
  order by published_at desc
  limit p_limit;
$$;

revoke all on function public.match_feed_articles(vector, timestamptz, double precision, integer, integer) from public, anon, authenticated;
grant execute on function public.match_feed_articles(vector, timestamptz, double precision, integer, integer) to service_role;
