# MyFeed — Project State
**Updated**: 2026-04-05

## What This Is
AI-powered feed aggregator SaaS. Users describe what they care about in plain English, AI curates content from thousands of sources.

## Stack
- **Frontend**: Next.js 15.5 (App Router), Tailwind CSS 4, dark theme
- **Backend**: Next.js API routes, Supabase (Postgres + Auth)
- **AI**: Claude Haiku for article scoring + search plan generation
- **Content**: 54 RSS sources + Brave Search API (free tier)
- **Hosting**: Railway (feedbot service, standalone output)
- **Domain**: myfeed.space (root + www, SSL)
- **Payments**: Lemon Squeezy (code exists, not wired)
- **Email**: Resend (code ready, needs RESEND_API_KEY)
- **Analytics**: GA + Mixpanel (code deployed, needs env vars)

## Current Phase: Feed Quality + Public Feeds
- Site live at https://myfeed.space
- 18 public feed tabs + slug-based custom public feeds
- Unified tab bar: For You → feed tabs → user custom feeds
- Drag-and-drop tab reorder, X to remove tabs
- Explore page with all public feeds
- Auto-cron every 15 min (direct function calls, no HTTP)
- Public feeds: any user can publish, others discover via Explore

## Key Architecture
- **Article Pool**: shared table, scanned from 54 RSS sources + Brave Search
- **Prompt Intelligence**: AI generates search plans with scoring_criteria per feed
- **Pre-filter**: keyword matching (2-match minimum for generic sources) + spam filter + language filter
- **AI Scorer**: Claude Haiku scores 0-100 with per-feed scoring criteria, threshold 70+
- **Source Boost**: Nature/NASA +15, HN +20, Ars Technica +15, etc.
- **Display Layer**: freshness decay, story clustering, source diversity cap (40%)
- **User Feedback**: reactions (like/dislike) influence scoring
- **Cron**: direct function calls in instrumentation.ts (no HTTP proxy)
- **Public Feeds**: is_public flag, slug URLs, feed_followers table, view tracking

## HARD RULES (from user)
- Platform: Railway (NEVER Vercel)
- Payments: Lemon Squeezy (NEVER Stripe) — skip for now
- Domain: myfeed.space (root, no www)
- No Dashboard page — everything in tab bar
- Explore = button on right, not a tab

## What's Done (Apr 4-5 session)
- [x] Brave Search API integration
- [x] Pipeline optimization (batch, summary, scoring, cost -85%)
- [x] Feed quality overhaul (Science 32%→87%, Health 0%→83%)
- [x] 17 new RSS sources for thin categories
- [x] Domain-specific search plans for all 18 feeds
- [x] Spam/SEO filter, language filter, dedup improvements
- [x] Freshness decay, story clustering, source diversity
- [x] Public feeds feature (is_public, slugs, follow, explore)
- [x] UX refactor (tab bar DnD, remove tabs, no dashboard)
- [x] Cron reliability fix (direct calls, no HTTP proxy)
- [x] View tracking (saved, not displayed)

## Known Issues
- Climate, Health, Gaming feeds still thin — growing via cron
- Mobile DnD not working (HTML5 DnD is desktop only)

## Env Vars on Railway (ALL SET)
- ANTHROPIC_API_KEY ✅
- BRAVE_SEARCH_API_KEY ✅
- CRON_SECRET ✅
- NEXT_PUBLIC_APP_URL ✅
- NEXT_PUBLIC_GA_ID ✅ (G-48QCPWF8KD)
- NEXT_PUBLIC_MIXPANEL_TOKEN ✅
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
- NEXT_PUBLIC_SUPABASE_URL ✅
- SUPABASE_SERVICE_ROLE_KEY ✅
- RESEND_API_KEY ✅
- NODE_ENV ✅
- PORT ✅
- RAILWAY_PUBLIC_DOMAIN ✅

## Production QA (2026-04-06) — ALL PASS
- Homepage: For You feed with 12+ sources, articles loading
- AI & ML: Relevant articles with cover images
- Science: Quality Phys.org content
- Gaming: Growing (was thin, now has content)
- Explore: Prompt chips, search, 3-column grid
- Contact: Form + Resend email delivery
- Privacy / Terms: Complete legal pages
- Menu: User email, dark mode, digest, sign out, legal links
- Console: 1 CORB warning only (browser-level, not a bug)
- Tab bar: Scrollable, all feeds clickable
