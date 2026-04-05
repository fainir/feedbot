-- Public feeds: allow users to publish their feeds for others to discover
-- Public feeds are scored ONCE and served to all followers (cost-efficient)

alter table public.feeds add column if not exists is_public boolean not null default false;
create index idx_feeds_public on public.feeds(is_public, is_active) where is_public = true;

-- Followers: users can follow public feeds without creating their own copy
create table if not exists public.feed_followers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, feed_id)
);

alter table public.feed_followers enable row level security;
create policy "Users can manage own follows" on public.feed_followers for all using (auth.uid() = user_id);
create index idx_feed_followers_user on public.feed_followers(user_id);
create index idx_feed_followers_feed on public.feed_followers(feed_id);

-- Allow anyone to read public feed items (for the public feeds API)
create policy "Anyone can view public feed items" on public.feed_items
  for select using (
    exists (
      select 1 from public.feeds
      where feeds.id = feed_items.feed_id
      and (feeds.is_public = true or feeds.user_id = '9c313e5c-1468-467b-a797-6ceb9bd7d09b')
    )
  );
