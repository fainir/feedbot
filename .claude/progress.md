# MyFeed — Progress Report

**Project:** MyFeed (myfeed.space)
**Date:** 2026-04-05
**Phase:** Post-MVP — Feed Quality + Public Feeds
**Overall Completion:** 80% (feeds working well, UX refactored, revenue still not wired)

## What's Done

### Feed Pipeline Overhaul (Apr 4-5) — 15 commits
- Brave Search API integrated (free tier, 2000 req/month)
- AI scoring: batch 100, 200 char summaries, per-feed scoring criteria
- 54 RSS sources (was 23) — Nature, NASA, ScienceDaily, SpaceNews, STAT News, etc.
- Schedule-aware cron: daily/hourly/realtime feed refresh
- User feedback loop: reactions influence AI scoring
- Freshness decay + story clustering + source diversity in display
- Cron runs direct function calls (no HTTP proxy timeout)
- Domain-specific search plans for all 18 feeds
- Spam/SEO filter, language filter, 2-match minimum for generic sources
- URL normalization, title dedup, article quality signals

### Feed Quality Results
| Feed | Before (Apr 4) | After (Apr 5) |
|------|----------------|---------------|
| Science | 32% on-topic | ~87% on-topic |
| Health | 0% (2 articles) | ~83% (8 articles) |
| Space | 10 articles, 1 topic | 58+ articles, diverse |
| AI & ML | 80%, duplicates | 80%+, deduped |
| Startups | 84% | 84%+, deduped |
| AI cost/month | ~$150-230 | ~$15-30 |

### Public Feeds Feature (Apr 5)
- Any feed publishable as public (is_public flag + slug URLs)
- myfeed.space/<slug> loads any public feed
- Explore page: unified grid of all public feeds
- Follow/unfollow API ready
- View tracking (counting, not displayed yet)
- Feed creation generates URL-safe slugs

### UX Refactor (Apr 5)
- Removed Dashboard — everything in tab bar
- Drag-and-drop tab reorder with custom drag image
- X to remove tabs (inline, first-time confirmation + "Don't show again")
- User custom feeds appear as tabs
- Explore (outlined) + Create feed (filled) buttons on right
- For You tab: font-semibold + thin divider
- Scrollbar hidden

### Infrastructure
- Live on Railway at myfeed.space
- Supabase auth + Postgres
- Cron: direct function calls every 15 min (reliable, no proxy)
- Brave Search API active
- 54 RSS sources scanning continuously

## Key Metrics

| Metric | Value | Change |
|--------|-------|--------|
| RSS sources | 54 | +31 from Apr 3 |
| AI cost/month (est.) | $15-30 | -85% from $150-230 |
| Public feeds | 18 system + slug URLs | New |
| Article pool | 1500+ | Growing ~100/day |
| Cron reliability | Direct calls | Fixed (was dying on deploy) |

## What's Next
1. Wire Lemon Squeezy payments
2. Set analytics env vars (GA4, Mixpanel)
3. Pricing page (/pricing)
4. Landing page polish
5. Thin feeds will grow over cron cycles (Climate, Health, Gaming)

## Blockers
- Revenue is $0 — payments not wired
- RESEND_API_KEY not set — email digests disabled
- GA4/Mixpanel tokens not set — no analytics

## Decisions Made (Apr 4-5)
| Decision | Rationale |
|----------|-----------|
| Direct cron calls over HTTP | HTTP proxy times out at 120s, killing scans |
| 2-match minimum for DEV/Medium | Reduces cross-feed contamination dramatically |
| 3-day article pool window | Thin feeds need more candidates |
| Per-feed scoring_criteria | One-size-fits-all prompt caused Science contamination |
| Public feeds at /<slug> | Clean URLs, no /community/ prefix |
| Unified explore page | Curated + community = all just "public feeds" |
| sessionStorage for tab prefs | Unsigned users don't persist, signed users will use DB |
