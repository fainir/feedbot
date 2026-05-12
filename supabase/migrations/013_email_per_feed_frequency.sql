-- Per-feed email digest frequency.
--
-- Before: one row per user with `feed_ids uuid[]` (which feeds to include) and
-- one global `digest_frequency` (daily/weekly/hourly). All included feeds fired
-- on the same cadence.
--
-- After: a `feed_frequencies` jsonb column holds the per-feed cadence + the
-- per-feed last-sent timestamp. Shape:
--
--   {
--     "<feed_uuid_1>": { "frequency": "daily",  "last_sent_at": "2026-05-11T08:00:00Z" },
--     "<feed_uuid_2>": { "frequency": "weekly", "last_sent_at": null }
--   }
--
-- The digest cron iterates this map, picks feeds that are due, and aggregates
-- them into a single email per user. `feed_ids` + `digest_frequency` are kept
-- as compatibility fallbacks for any row that hasn't been migrated yet.

alter table public.email_preferences
  add column if not exists feed_frequencies jsonb not null default '{}'::jsonb;

-- Backfill: every UUID currently in feed_ids inherits the global digest_frequency.
-- Skip rows that already have a non-empty feed_frequencies (e.g. re-runs).
update public.email_preferences ep
set feed_frequencies = sub.fm
from (
  select
    user_id,
    coalesce(
      jsonb_object_agg(
        f::text,
        jsonb_build_object('frequency', digest_frequency, 'last_sent_at', last_digest_at)
      ),
      '{}'::jsonb
    ) as fm
  from public.email_preferences,
       unnest(coalesce(feed_ids, ARRAY[]::uuid[])) as f
  group by user_id, digest_frequency, last_digest_at
) sub
where ep.user_id = sub.user_id
  and (ep.feed_frequencies is null or ep.feed_frequencies = '{}'::jsonb);

comment on column public.email_preferences.feed_frequencies is
  'JSONB map: feed_uuid -> { frequency: "daily"|"weekly"|"never", last_sent_at: iso-ts|null }.';
