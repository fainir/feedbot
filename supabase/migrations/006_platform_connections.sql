-- Platform connections for interest signals
create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('bluesky', 'mastodon', 'github', 'youtube', 'reddit', 'hackernews', 'twitch', 'producthunt')),
  access_token text not null,
  refresh_token text,
  platform_user_id text,
  platform_username text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique(user_id, platform)
);

alter table public.platform_connections enable row level security;
create policy "Users can manage own connections" on public.platform_connections for all using (auth.uid() = user_id);
create index idx_platform_connections_user on public.platform_connections(user_id);

-- Interest signals extracted from connected platforms
create table if not exists public.interest_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  signal_type text not null,
  content text not null,
  weight int not null default 50,
  created_at timestamptz not null default now()
);

alter table public.interest_signals enable row level security;
create policy "Users can view own signals" on public.interest_signals for select using (auth.uid() = user_id);
create index idx_interest_signals_user on public.interest_signals(user_id);
