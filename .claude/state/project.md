# MyFeed — Project State
**Updated**: 2026-04-03

## What This Is
AI-powered feed aggregator SaaS. Users describe what they care about in plain English, AI curates content from thousands of sources.

## Stack
- **Frontend**: Next.js 15.5 (App Router), Tailwind CSS 4, dark theme
- **Backend**: Next.js API routes, Supabase (Postgres + Auth)
- **AI**: Claude Haiku for article scoring + search plan generation
- **Hosting**: Railway (feedbot service)
- **Domain**: myfeed.space (root + www, SSL via Let's Encrypt)
- **Payments**: Lemon Squeezy (code exists, not wired — user said skip for now)
- **Email**: Resend (code ready, needs RESEND_API_KEY on Railway)
- **Analytics**: Google Analytics (NEXT_PUBLIC_GA_ID) + Mixpanel (NEXT_PUBLIC_MIXPANEL_TOKEN) — code deployed, needs env vars

## Current Phase: MVP LIVE — Post-QA
- Site is live at https://myfeed.space
- 18 public feed tabs with AI-curated content
- Auto-cron every 15 min (instrumentation hook)
- Signup/login working (email + Google OAuth)
- Custom feed creation with AI search plans
- Reactions + bookmarks persisted to DB
- Per-feed SEO metadata + OG images
- Structured data (JSON-LD)
- Analytics integration (GA + Mixpanel)
- Email digest system ready (needs RESEND_API_KEY)

## Key Architecture
- **Article Pool**: shared table, scanned from 23+ RSS sources globally
- **Prompt Intelligence**: AI generates search plans per feed (cached in DB)
- **Targeted Scanner**: per-feed scanning using AI-generated queries
- **AI Scorer**: Claude Haiku scores articles 0-100, threshold 70+
- **Source Boost**: HN/Ars Technica/TechCrunch get +15-20 bonus
- **Auto-cron**: Next.js instrumentation hook runs scan+match+digest every 15min

## HARD RULES (from user)
- Platform: Railway (NEVER Vercel)
- Payments: Lemon Squeezy (NEVER Stripe) — but skip payments for now
- Domain: myfeed.space (root, no www)
- Default tab: AI & ML (first)

## What's Done (this session)
- [x] Email digest system (migration, cron route, instrumentation hook)
- [x] SEO: per-feed meta titles, OG images, structured data, metadataBase fix
- [x] Analytics: GA + Mixpanel with event tracking (signup, login, create_feed, share)
- [x] Article card improvements (gradient fallbacks, better RSS image extraction)
- [x] UX audit: signup→prompt→feed flow verified on desktop + mobile
- [x] CSP headers updated (removed Stripe, added GA/Mixpanel)
- [x] Feed quality audit (QA agent)

## Known Issues
- Some system feeds have old unscored articles (pre-AI-scoring era)
- Science tab has ~60% off-topic contamination (will improve as new scored articles replace old)
- RESEND_API_KEY not set on Railway (email digests disabled)
- GA + Mixpanel tokens not set on Railway (analytics collecting nothing)

## Env Vars Needed on Railway
- NEXT_PUBLIC_GA_ID (Google Analytics measurement ID)
- NEXT_PUBLIC_MIXPANEL_TOKEN (Mixpanel project token)
- RESEND_API_KEY (for email digests)
- BRAVE_SEARCH_API_KEY (optional, for extra coverage)
