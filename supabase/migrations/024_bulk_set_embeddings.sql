-- Bulk embedding writes. The embed route was issuing one UPDATE per row
-- (256/page × up to 12 pages = ~3,000 round-trips/call), which blew the
-- cron's embed-phase timeout and hammered Disk IO. This RPC writes a whole
-- page in a single statement via unnest(), turning 256 round-trips into 1.

create or replace function public.set_article_embeddings(
  p_ids uuid[],
  p_embeddings text[]
)
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  update public.article_pool a
  set embedding = d.emb
  from (
    select unnest(p_ids) as id, unnest(p_embeddings)::vector(512) as emb
  ) d
  where a.id = d.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.set_article_embeddings(uuid[], text[]) from public, anon, authenticated;
grant execute on function public.set_article_embeddings(uuid[], text[]) to service_role;
