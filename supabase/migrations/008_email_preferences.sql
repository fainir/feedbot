-- Email preferences for digest delivery
create table if not exists public.email_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  digest_enabled boolean not null default false,
  digest_frequency text not null default 'daily' check (digest_frequency in ('hourly', 'daily', 'weekly')),
  feed_ids uuid[] default null,
  last_digest_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_preferences enable row level security;
create policy "Users can manage own email prefs" on public.email_preferences
  for all using (auth.uid() = user_id);

-- Add article_pool_id and relevance_score to feed_items if not present
alter table public.feed_items add column if not exists article_pool_id uuid references public.article_pool(id);
alter table public.feed_items add column if not exists relevance_score integer default 0;
create index if not exists idx_feed_items_pool on public.feed_items(article_pool_id);
