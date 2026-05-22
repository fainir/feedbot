-- Disk I/O budget relief, round 2.
--
-- 014 added the right indexes (pg_trgm for ILIKE, composite for feed_items).
-- That helped read performance but the underlying problem was:
--   1. Prune was wired in code but never scheduled, so article_pool and
--      feed_items grew unbounded for ~6 months.
--   2. Default autovacuum thresholds (20% dead tuples) are too lax for
--      tables that churn this fast. After we start pruning aggressively,
--      bloat accumulates faster than autovacuum reclaims it.
--   3. idx_feed_items_feed_relevance (feed_id, relevance_score DESC) was
--      added by 014 but the route handler orders by published_at, not
--      relevance_score. The (feed_id, published_at DESC) index from
--      migration 001 is what's actually getting used. Drop the dead one
--      so write-amp from inserts isn't doubled.
--
-- This migration:
--   - Drops the unused relevance_score index (cheap write win)
--   - Tightens autovacuum on the hot tables (more frequent reclaim)
--   - ANALYZE so the planner has fresh stats after upcoming prunes

drop index if exists public.idx_feed_items_feed_relevance;

-- Autovacuum gets aggressive on these two tables specifically. Defaults
-- vacuum at 20% dead rows; we drop to 5% so prune-induced deletions get
-- reclaimed quickly instead of bloating the indexes.
alter table public.article_pool set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

alter table public.feed_items set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

analyze public.article_pool;
analyze public.feed_items;
