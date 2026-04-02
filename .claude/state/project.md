# MyFeed — Source of Truth

## Stack: Railway + Supabase + Lemon Squeezy
## URL: https://feedbot-production.up.railway.app

## Status: LIVE WITH REAL CONTENT (2026-04-02)
- ✅ 576 real articles in DB from RSS
- ✅ 30 articles per tab, read from DB (instant)
- ✅ Background scanner refreshes all feeds
- ✅ System feeds: Tech, AI, Startups, Dev, Science (realtime schedule)
- ✅ Content accumulates over time
- ✅ Zero LLM tokens — pure RSS
- ✅ B&W X.com-style theme with toggle
- ✅ Product-first homepage (no auth wall)

## Content Pipeline
- Scanner: cron refreshes 5 RSS sources per feed
- Storage: Supabase feed_items table (dedup by URL)
- Serving: /api/public/feeds reads from DB (instant)
- Scale: 200 articles/feed/day, growing archive

## Needs
- External cron (cron-job.org) to ping /api/cron/refresh-feeds every 15 min
- Lemon Squeezy keys for payments
- Browser testing of login → dashboard flow
