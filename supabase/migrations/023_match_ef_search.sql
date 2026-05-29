-- Fix: a STABLE function can't use `SET LOCAL` (0A000). Attach hnsw.ef_search
-- to the function via ALTER FUNCTION instead — same effect (high recall for
-- the HNSW search), no in-body SET, function stays STABLE + index-friendly.

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
language sql
stable
as $$
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
$$;

-- ef_search must be >= the inner candidate LIMIT for good HNSW recall.
alter function public.match_feed_articles(vector, timestamptz, double precision, integer, integer)
  set hnsw.ef_search = 400;

revoke all on function public.match_feed_articles(vector, timestamptz, double precision, integer, integer) from public, anon, authenticated;
grant execute on function public.match_feed_articles(vector, timestamptz, double precision, integer, integer) to service_role;
