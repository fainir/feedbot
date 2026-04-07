# MyFeed — Task Board

*Last updated: 2026-04-05T10:40Z*

## In Progress
(none)

## Completed (2026-04-06)
- [x] Production QA — full site audit on myfeed.space (all pages pass)

## Up Next (Priority Order)

### P1 — High Impact
- [ ] Wire Lemon Squeezy payments end-to-end (post-MVP)

### P1 — High Impact
- [ ] Build pricing page (/pricing) — Free vs Pro comparison
- [ ] Polish landing page — hero, social proof, CTA
- [ ] Story clustering display — show "X more articles about this" instead of hiding duplicates
- [ ] Click-through tracking — track which articles users open for better scoring
- [ ] Adaptive search plans — regenerate plans using reaction data after 7 days

### P2 — Nice to Have
- [ ] Embedding-based matching (semantic similarity instead of keyword pre-filter)
- [ ] Two-pass scoring (Haiku → Sonnet for top candidates)
- [ ] Account deletion endpoint + UI
- [ ] Subscription self-serve cancellation UI
- [ ] Email templates — branded digest emails
- [ ] Mobile touch DnD for tab reorder (HTML5 DnD works desktop only)

## Resolved (env vars all set on Railway)
- [x] RESEND_API_KEY — set on Railway
- [x] NEXT_PUBLIC_GA_ID — set on Railway (G-48QCPWF8KD)
- [x] NEXT_PUBLIC_MIXPANEL_TOKEN — set on Railway
- [x] BRAVE_SEARCH_API_KEY — set on Railway

## Completed (2026-04-05)
- [x] Brave Search API — signed up, got key, set on Railway + .env.local
- [x] Pipeline optimization — batch 50→100, summary 120→200, max tokens 512→1024
- [x] Schedule-aware cron — daily/hourly/realtime filters, skip feeds not due
- [x] Smart Brave queries — per-feed search plan queries instead of generic
- [x] User feedback loop — reactions influence AI scoring + source boost
- [x] 17 new RSS sources — Science, Space, Health, Climate, Fintech, Gaming
- [x] Source quality boosts — Nature +15, NASA +15, STAT News +15, etc.
- [x] Title deduplication — first 8 words match in public feeds API
- [x] Spam/SEO filter — blocks agencies, cert farms, buying guides
- [x] Anti-contamination rules — UX≠Science, Space≠AI, "uses AI"≠"about AI"
- [x] Non-English language filter — Portuguese, Spanish, French, Indonesian
- [x] URL normalization — strips tracking params, dedupes Medium tag feeds
- [x] 2-match minimum for DEV/Medium sources (reduces false positives)
- [x] Freshness decay — recent articles rank higher in display
- [x] Story clustering — groups similar titles, keeps best per cluster
- [x] Source diversity cap — 40% max per source in feed display
- [x] Prompt expansion — richer search plan generation with domain terms
- [x] Per-feed scoring criteria — custom AI judgment rules per domain
- [x] Article quality signal — reject stubs with <30 char content
- [x] Cron reliability — force-refresh on deploy, direct function calls (no HTTP proxy)
- [x] Cron timeout fix — 120s→300s, then replaced HTTP with direct calls
- [x] Article pool window 1 day→3 days for thin feeds
- [x] Domain-specific search plans — updated Science, Health, Space, Climate, Fintech, Gaming, Marketing, AI, Startups, Dev (DB)
- [x] Public feeds — is_public column, feed_followers table, slug URLs
- [x] Community feed pages — myfeed.space/<slug> loads any public feed
- [x] Follow/unfollow API — POST/DELETE /api/feeds/[id]/follow
- [x] Explore page — unified public feeds grid, community + curated merged
- [x] Feed creation with public checkbox — "Make this feed public"
- [x] Slug generation — auto-generated URL-safe slugs on feed creation
- [x] View tracking — views column, POST /api/feeds/[id]/view, sorted in explore
- [x] Tab bar refactor — removed Dashboard, added drag-and-drop reorder
- [x] Tab removal — X on hover with first-time confirmation popup + "Don't show again"
- [x] Tab persistence — order + hidden saved to sessionStorage
- [x] User feeds as tabs — custom feeds appear in tab bar
- [x] Button swap — Explore (outlined) left, Create feed (filled) right
- [x] Scrollbar hidden — CSS scrollbar-hide fix
- [x] Inline close icon — X appears after tab name on hover
- [x] Custom drag image — styled pill matching tab appearance
- [x] For You differentiation — font-semibold + thin divider
- [x] output: "standalone" added to next.config.ts

## Previously Completed (2026-04-04 and earlier)
- [x] 18 public feed tabs with AI-scored articles
- [x] Signup/login (email + Google OAuth)
- [x] Custom feed creation with AI search plans
- [x] Global scanner (42→54 RSS sources)
- [x] AI scoring with source quality boosts
- [x] Reactions + bookmarks
- [x] Per-feed SEO metadata + OG images
- [x] Dark theme responsive UI
- [x] Railway deployment (myfeed.space)
- [x] Security hardening (CSP, HSTS, rate limiting)
