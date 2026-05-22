-- Drop the feed_items.article_pool_id FK constraint.
--
-- Background: the prune cron was wedged because every DELETE on
-- article_pool had to fire ON DELETE SET NULL cascades into feed_items,
-- which made even a 5K-row delete exceed Supabase's 8s statement_timeout.
-- We tried wrapping in a SECURITY DEFINER function with SET LOCAL
-- statement_timeout = '90s' — Supabase's pooler still capped the
-- request, and the cascade trigger overhead was the real bottleneck
-- regardless of timeout.
--
-- The FK only existed for traceability of "which raw scan an article
-- came from". The column stays so existing classifier dedup logic
-- (alreadyMatched check in scan-and-match) still works; we just stop
-- enforcing referential integrity. A few dangling article_pool_id
-- values in feed_items after prune are harmless — the dedup query
-- treats them as misses, which is the correct behavior anyway since
-- the underlying raw article is gone.
--
-- Manual cleanup that ran prior to this migration (in the Supabase SQL
-- editor with statement_timeout raised to 5min):
--   - DELETE FROM article_pool WHERE published_at < now() - interval '7 days'
--     → 351,182 rows removed (416,884 → 65,702)
--   - feed_items pruning had already run successfully (165,788 → 57,602)
--
-- Going forward the prune cron handles steady-state churn; with the FK
-- gone, simple predicate deletes finish well under statement_timeout.

alter table public.feed_items
  drop constraint if exists feed_items_article_pool_id_fkey;

-- Keep the column + index — both are still used by the classifier's
-- alreadyMatched dedup logic.
-- (idx_feed_items_pool on feed_items(article_pool_id) stays.)
