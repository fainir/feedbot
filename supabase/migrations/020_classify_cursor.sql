-- Lossless classify cursor + keyset index.
--
-- The cron classify step used a "created_at >= last_classified_at, newest
-- 200, then advance last_classified_at = now()" scheme. On any tick that
-- received more than 200 new articles (average intake is ~215/tick), the
-- overflow fell below the next cutoff and was NEVER classified — a
-- permanent loss that starved feeds (e.g. /ai showed ~13 fresh items/day
-- against 9,500 fresh AI-eligible articles in the pool).
--
-- The fix is a forward keyset cursor on (created_at, id) processed
-- oldest-first, advancing only past rows actually fetched. This needs:
--   1. somewhere to store the cursor's id tie-break (scan_state only has a
--      timestamptz column), and
--   2. a composite index so the keyset scan stays sub-ms.

-- 1) Cursor id storage. scan_state.last_scanned_at (timestamptz) holds the
--    cursor's created_at; this column holds the uuid tie-break. Nullable so
--    every other scan_state row (which only uses the timestamp) is unaffected.
alter table public.scan_state add column if not exists cursor_id text;

-- 2) Composite index for the keyset predicate
--    `created_at > c OR (created_at = c AND id > cid) ORDER BY created_at, id`.
--    article_pool previously had no index on created_at at all, yet classify
--    filters and sorts on it. (created_at, id) serves the keyset directly.
create index if not exists idx_article_pool_created_at_id
  on public.article_pool (created_at, id);

analyze public.article_pool;
