-- Disk I/O budget relief — indexes only.
--
-- pg_stat_user_tables showed article_pool was being sequentially scanned
-- ~7000 times reading ~957M tuples. Root cause: the public feed search
-- does ILIKE '%kw%' OR ILIKE '%kw%' on article_pool.title, and ILIKE with
-- leading wildcards can't use a btree index — the planner has no choice
-- but a full seq scan per request.
--
-- pg_trgm + a GIN index makes ILIKE indexable, cutting that to a sub-ms
-- index lookup. We also add a recency-scoped composite for feed_items.

create extension if not exists pg_trgm;

create index if not exists idx_article_pool_title_trgm
  on public.article_pool using gin (title gin_trgm_ops);

create index if not exists idx_article_pool_published_at_desc
  on public.article_pool (published_at desc);

create index if not exists idx_feed_items_feed_relevance
  on public.feed_items (feed_id, relevance_score desc);

analyze public.article_pool;
analyze public.feed_items;
