-- Allow article_pool prune to proceed without FK blockage.
--
-- feed_items.article_pool_id was added in migration 008 as a plain FK with
-- no ON DELETE clause, defaulting to NO ACTION. That means PostgreSQL
-- refuses to delete an article_pool row that any feed_item still
-- references — even if the prune cron tries to remove old article_pool
-- rows that have a much-newer feed_item pointing back at them.
--
-- The back-reference is only used for analytics (looking up which raw
-- scan an article came from). It's safe to NULL it when the source row
-- is gone — the feed_item itself stays intact.
--
-- Change to ON DELETE SET NULL so prune can do its job.

-- Find the existing FK constraint name (Supabase auto-names it
-- feed_items_article_pool_id_fkey).
alter table public.feed_items
  drop constraint if exists feed_items_article_pool_id_fkey;

alter table public.feed_items
  add constraint feed_items_article_pool_id_fkey
  foreign key (article_pool_id)
  references public.article_pool(id)
  on delete set null;
