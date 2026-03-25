-- Waitlist for email capture
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- No RLS needed — only accessed via service role key from API
