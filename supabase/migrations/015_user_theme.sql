-- User theme preference. Stored on profiles so it survives device changes
-- and stays in sync across the user's sessions.
--
-- Default is 'dark' to match the in-app default (the homepage and feed
-- surfaces are designed dark-first).
--
-- Client behaviour:
--   - Guests: localStorage only (default 'dark').
--   - Logged-in users: localStorage stays authoritative for that browser, but
--     on sign-in we read profiles.theme and write it back to localStorage so
--     other devices pick up the choice. On each toggle we PUT to /api/user/theme.

alter table public.profiles
  add column if not exists theme text not null default 'dark'
    check (theme in ('dark', 'light'));
