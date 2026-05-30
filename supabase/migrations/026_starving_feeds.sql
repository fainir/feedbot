-- Find feeds below the freshness SLO so the cron can top them up with
-- targeted search. This is what makes EVERY feed — including brand-new
-- niche ones — converge to "good": a feed that isn't getting enough fresh
-- posts from the shared RSS pool gets its exact prompt searched on Google
-- News (free) + Brave (capped), demand-driven so rich feeds cost nothing.
create or replace function public.starving_feeds(
  p_min_fresh integer default 8,
  p_max integer default 10,
  p_since_hours integer default 48
)
returns table(id uuid, name text, query_text text, fresh bigint)
language sql
stable
as $$
  select f.id, f.name, f.query_text, count(fi.id) as fresh
  from public.feeds f
  left join public.feed_items fi
    on fi.feed_id = f.id
   and fi.published_at >= now() - (p_since_hours || ' hours')::interval
  where f.is_active
  group by f.id, f.name, f.query_text
  having count(fi.id) < p_min_fresh
  order by count(fi.id) asc, f.last_refreshed_at asc nulls first
  limit p_max;
$$;

revoke all on function public.starving_feeds(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.starving_feeds(integer, integer, integer) to service_role;
