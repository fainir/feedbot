-- FeedBot Database Schema

-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Feeds
create table public.feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  query_text text not null,
  schedule text not null default 'daily' check (schedule in ('daily', 'hourly', 'realtime')),
  notify_email boolean not null default false,
  notify_push boolean not null default false,
  notify_whatsapp boolean not null default false,
  is_active boolean not null default true,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.feeds enable row level security;
create policy "Users can manage own feeds" on public.feeds for all using (auth.uid() = user_id);
create index idx_feeds_user on public.feeds(user_id);
create index idx_feeds_schedule on public.feeds(schedule, is_active);

-- Feed Items
create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.feeds(id) on delete cascade,
  title text not null,
  url text not null,
  summary text not null default '',
  source text not null default '',
  image_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.feed_items enable row level security;
create policy "Users can view own feed items" on public.feed_items
  for select using (
    exists (select 1 from public.feeds where feeds.id = feed_items.feed_id and feeds.user_id = auth.uid())
  );
create index idx_feed_items_feed on public.feed_items(feed_id, published_at desc);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  channel text not null check (channel in ('email', 'push', 'whatsapp')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  content text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create index idx_notifications_user on public.notifications(user_id, created_at desc);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);
create index idx_subscriptions_user on public.subscriptions(user_id);

-- Function: auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
