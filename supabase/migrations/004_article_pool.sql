-- Article Pool: shared articles scanned once, served to many feeds via AI matching

-- Global article pool - all discovered articles go here
create table public.article_pool (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  summary text not null default '',
  source text not null default '',
  image_url text,
  category text not null default 'general',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_article_pool_published on public.article_pool(published_at desc);
create index idx_article_pool_category on public.article_pool(category, published_at desc);
create index idx_article_pool_url on public.article_pool(url);

-- No RLS on article_pool - accessed by service role only
-- Public reads happen through feed_items (which has RLS)

-- Track which articles were scored for which feeds
-- This prevents re-scoring the same article for the same feed
alter table public.feed_items add column if not exists article_pool_id uuid references public.article_pool(id);
alter table public.feed_items add column if not exists relevance_score float;

-- Track last scan time per category
create table public.scan_state (
  category text primary key,
  last_scanned_at timestamptz not null default now()
);

-- Seed scan categories
insert into public.scan_state (category) values
  ('technology'),
  ('ai'),
  ('startups'),
  ('programming'),
  ('science'),
  ('business'),
  ('crypto'),
  ('design'),
  ('security'),
  ('gaming')
on conflict do nothing;
