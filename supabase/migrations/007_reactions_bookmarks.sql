-- Reactions table: thumbs up/down on feed items
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feed_item_id uuid not null references public.feed_items(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  unique(user_id, feed_item_id)
);
alter table public.reactions enable row level security;
create policy "Users can manage own reactions" on public.reactions for all using (auth.uid() = user_id);

-- Bookmarks table: saved items per user
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feed_item_id uuid not null references public.feed_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, feed_item_id)
);
alter table public.bookmarks enable row level security;
create policy "Users can manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id);
