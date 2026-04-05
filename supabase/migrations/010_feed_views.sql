-- Track feed views for sorting in Explore
alter table public.feeds add column if not exists views bigint not null default 0;
create index if not exists idx_feeds_views on public.feeds(views desc) where is_public = true;
