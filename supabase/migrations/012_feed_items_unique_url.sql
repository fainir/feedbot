-- Remove duplicate (feed_id, url) rows — keep the one with the highest relevance_score
SET statement_timeout = '120s';

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY feed_id, url
      ORDER BY relevance_score DESC NULLS LAST, created_at DESC
    ) AS rn
  FROM public.feed_items
)
DELETE FROM public.feed_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint so classifyAndInsert upsert works correctly
ALTER TABLE public.feed_items
  ADD CONSTRAINT feed_items_feed_url_unique UNIQUE (feed_id, url);
