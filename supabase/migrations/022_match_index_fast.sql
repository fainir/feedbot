-- Make match_feed_articles actually use the HNSW index.
--
-- The 021 version filtered `published_at >= p_since` INSIDE the
-- ORDER BY embedding <=> q query. With a filter present and the default
-- ef_search (40 < our candidate count), the planner fell back to a
-- sequential scan computing cosine distance over every embedded row —
-- ~6.8s per call, which blew the fill budget across 125 feeds.
--
-- Fix:
--   1. Pure HNSW inner query (ORDER BY embedding <=> q LIMIT k, no other
--      predicate) so the index is unambiguously used (~ms).
--   2. SET LOCAL hnsw.ef_search high enough to return k quality neighbours.
--   3. Apply the recency + similarity filters in the OUTER query, then
--      order the survivors by recency. article_pool is pruned to ~7 days,
--      so the K nearest neighbours are already almost all in-window.

create or replace function public.match_feed_articles(
  p_embedding vector(512),
  p_since timestamptz,
  p_min_similarity double precision default 0.40,
  p_candidates integer default 250,
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
language plpgsql
stable
as $$
begin
  -- ef_search must be >= the inner LIMIT for good HNSW recall.
  set local hnsw.ef_search = 400;
  return query
  with top as (
    select a.id, a.title, a.url, a.summary, a.source, a.image_url, a.published_at,
           1 - (a.embedding <=> p_embedding) as similarity
    from public.article_pool a
    order by a.embedding <=> p_embedding
    limit p_candidates
  )
  select t.id, t.title, t.url, t.summary, t.source, t.image_url, t.published_at, t.similarity
  from top t
  where t.published_at >= p_since
    and t.similarity >= p_min_similarity
  order by t.published_at desc
  limit p_limit;
end;
$$;

revoke all on function public.match_feed_articles(vector, timestamptz, double precision, integer, integer) from public, anon, authenticated;
grant execute on function public.match_feed_articles(vector, timestamptz, double precision, integer, integer) to service_role;
