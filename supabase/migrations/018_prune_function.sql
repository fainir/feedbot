-- Server-side prune function — bypasses the 8s default statement_timeout
-- on the public DB role.
--
-- The route-handler version was running DELETE statements via PostgREST,
-- which inherits the public role's 8s timeout. Every article_pool window
-- delete tripped it ("canceling statement due to statement timeout"). The
-- table is large (~400K rows + an FK back-reference index to maintain)
-- so even a 1-day window with LIMIT 2000 was slow enough to die.
--
-- Wrapping the delete in a SECURITY DEFINER function lets us SET LOCAL
-- statement_timeout = '90s' for the duration of the call. The route
-- handler now just RPCs this and iterates until the table is clean.

create or replace function public.prune_old_rows(
  p_table text,
  p_retention_days integer,
  p_batch_limit integer default 5000
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - (p_retention_days || ' days')::interval;
  v_deleted integer;
begin
  -- Raise the per-statement timeout for this call only. Restored
  -- automatically when the function returns.
  set local statement_timeout = '90s';

  if p_table = 'feed_items' then
    with victims as (
      select id from public.feed_items
       where published_at < v_cutoff
       order by published_at asc
       limit p_batch_limit
    )
    delete from public.feed_items f
     using victims v
     where f.id = v.id;
    get diagnostics v_deleted = row_count;

  elsif p_table = 'article_pool' then
    with victims as (
      select id from public.article_pool
       where published_at < v_cutoff
       order by published_at asc
       limit p_batch_limit
    )
    delete from public.article_pool a
     using victims v
     where a.id = v.id;
    get diagnostics v_deleted = row_count;

  else
    raise exception 'Unsupported table for prune: %', p_table;
  end if;

  return coalesce(v_deleted, 0);
end;
$$;

-- Anonymous users should never call this; restrict to service_role.
revoke all on function public.prune_old_rows(text, integer, integer) from public;
revoke all on function public.prune_old_rows(text, integer, integer) from anon;
revoke all on function public.prune_old_rows(text, integer, integer) from authenticated;
grant execute on function public.prune_old_rows(text, integer, integer) to service_role;
