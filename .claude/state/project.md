# MyFeed — Source of Truth

## Stack: Railway + Supabase + Lemon Squeezy
## URL: https://feedbot-production.up.railway.app

## Status: DEPLOYING REBRAND (2026-04-02)
- Renamed: FeedBot → MyFeed
- Homepage: product-first with 5 default feed tabs
- No auth wall: anyone can browse Tech/AI/Startups/Dev/Science feeds
- Sign in only for creating/editing custom feeds
- 3 users, 10 feeds, 326 articles

## Architecture Change
- Old: marketing landing page → sign up → dashboard
- New: feed tabs ARE the homepage → sign up to customize

## NEVER DO
- Never deploy to Vercel
- Never use Stripe
- Never put auth wall before content
