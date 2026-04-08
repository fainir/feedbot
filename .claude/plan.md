# FeedBot — Company Plan

## Active
- [x] Light mode color fix — gray page bg, white card bg (S)

## Vision
AI-curated personal feeds. Each tab = a custom prompt that pulls relevant content from the internet. Simple, useful, profitable.

## Product
- First tab: "All" — shows everything
- Users create custom tabs: name + prompt (e.g., "AI News", "Startup Ideas", "Tech Jobs")
- Each tab shows a curated feed of internet content matching the prompt
- Content auto-refreshes (daily cron or on-demand)
- Clean, fast, mobile-friendly

## Revenue Model
- Free tier: 3 tabs, daily refresh
- Pro ($9/mo): unlimited tabs, hourly refresh, email digest
- Team ($29/mo): shared tabs, team feeds, API access

## Tech Stack
- Next.js 16 + React 19 + Tailwind
- Vercel (hosting)
- Supabase (auth + DB) or SQLite for MVP
- Claude API (content curation)
- Web scraping / RSS for content sources

## Phase 1: MVP [DONE]
- [x] Tabs UI: "All" tab + "+" button to add custom tabs
- [x] Tab creation: name + prompt input
- [x] Feed generation: Brave Search API + mock fallback
- [x] Feed display: cards with title, summary, source, timestamp
- [x] Local storage for tabs
- [x] Deploy to Vercel
- [x] Feed templates (6 pre-built: AI, Startups, Dev Tools, Crypto, Design, Markets)

## Phase 2: Auth + Persistence [DONE]
- [x] Supabase auth (email/password + Google button)
- [x] Login/signup pages
- [x] Auth middleware (token refresh)
- [x] Auth callback route
- [x] Save feeds to Supabase DB (profiles, feeds, feed_items tables)
- [x] Cron job: refresh feeds daily (vercel.json)

## Phase 3: Marketing + SEO [DONE]
- [x] Killer landing page (social proof, testimonials, use cases, features grid)
- [x] SEO meta tags (OG, Twitter, robots, keywords, JSON-LD)
- [x] Dynamic OG image (Edge runtime)
- [x] sitemap.xml + robots.txt
- [x] PWA manifest + app icons
- [x] Share buttons (X, LinkedIn, copy link)
- [x] Email capture / waitlist API
- [x] Blog page for content marketing
- [x] Privacy policy + Terms of service
- [x] Vercel Analytics

## Phase 4: Monetization [IN PROGRESS]
- [x] Stripe checkout/portal/webhook routes (code ready)
- [x] Upgrade to Pro button in dashboard
- [x] Checkout success banner
- [ ] Set Stripe env vars on Vercel (sk_test, pk_test, whsec, price_id)
- [ ] Test end-to-end Stripe flow
- [x] Usage limit enforcement (3 feeds on free)

## Phase 5: Growth [IN PROGRESS]
- [!] Google OAuth provider setup in Supabase — BLOCKED: needs Supabase dashboard config
- [!] Brave Search API key for real content — BLOCKED: needs API key
- [x] Email digest for Pro users (Resend) — code complete, needs RESEND_API_KEY env var
- [!] Custom domain (feedbot.app?) — BLOCKED: needs domain purchase
- [x] Analytics dashboard for user metrics

## Phase 6: Polish + Quality [DONE]
- [x] Public API with rate limiting (rate-limit.ts + API routes with auth)
- [x] RSS feed output per user feed (via /api/feeds/[id]/export?format=rss)
- [x] Onboarding flow for new users (onboarding-tour.tsx + getting-started page)
- [x] Performance audit — lazy-load 11 heavy dashboard components (7K+ LOC code-split)
- [x] Error monitoring (ErrorBoundary component + Vercel Analytics already integrated)

## Phase 7: Accessibility + Polish [DONE]
- [x] Add aria-labels to all interactive feed card buttons (bookmark, pin, reader, share, etc.)
- [x] Add aria-labels to dashboard action buttons (search, notifications, settings)
- [x] Add aria-live regions for dynamic content updates (feed refresh, notifications)
- [x] Fix test reliability — ensure all date-dependent tests use fake timers correctly
- [x] Add tests for accessibility attributes on key components
- [x] Add skip-to-content link for keyboard navigation
- [x] Add proper heading hierarchy to dashboard pages

## Phase 8: UX & Code Quality [DONE]
- [x] Add loading spinner to refresh button during feed generation
- [x] Add focus trap to modal dialogs (7 modals: keyboard-shortcuts, share-feed, article-reader, global-search, reading-mode, command-palette + custom useFocusTrap hook)
- [x] Add keyboard Escape handler to all modal overlays (9 components: all modals + quick-share dropdown + bookmark-tags dropdown)
- [x] Improve tab bar accessibility with proper ARIA tablist pattern (role="tablist", role="tab", aria-selected, roving tabIndex, arrow key navigation)

## Phase 9: Code Quality [DONE]
- [x] Add React.memo to FeedCard component (prevents 50+ unnecessary re-renders on state changes)
- [x] Clean up console.log statements (removed debug log from waitlist route)
- [x] Add FeedCard unit tests — 79 tests covering rendering, interactions, a11y, edge cases, keyboard
- [x] Refactor FeedCard className to use cn() utility (cleaner conditional classes)
- [x] Error boundaries verified — Next.js error.tsx at root + dashboard levels already covers all routes

## Phase 10: Security Hardening [DONE]
- [x] Fix PostgREST filter injection in /api/feeds/search (sanitize q and source params)
- [x] Add admin role check to /api/admin/stats (ADMIN_EMAILS env var allowlist)
- [x] Fix open redirect in /auth/callback (validate `next` param, block // and ://)
- [x] Block cloud metadata IPs in SSRF protection (169.254.*, IPv6 private, metadata.google.internal)
- [x] Add CSP + HSTS security headers to next.config.ts
- [x] Write Stripe webhook tests (12 tests: signature, all event types, edge cases)
- [x] Write feeds CRUD tests (12 tests: auth, validation, plan limits, error handling)
- [x] Fix `any` type in FeedItemList.reactions → Record<string, string[]>
- [x] Redact Supabase error messages from API responses (5 routes: feeds CRUD, cron)
- [x] Use timing-safe comparison for cron secret validation
- [x] Add rate limiting to feed refresh endpoint (10 req/min per IP)
- [x] Restrict next/image remote patterns (was wildcard `**`, now limited to supabase/google)
- [x] Add production warning for missing Supabase env vars in middleware

## Phase 11: Performance + Test Coverage [DONE]
- [x] Add custom areEqual to FeedCard memo (skip function props — prevents unnecessary re-renders from inline closures in FeedItemList)
- [x] Write admin stats tests (5 tests: auth, admin role check, case-insensitive email, stats response)
- [x] Write feeds search tests (9 tests: auth, filters, sanitization, PostgREST injection prevention, limit cap)
- [x] Write feeds refresh tests (8 tests: rate limiting, auth, 404, dedup, engine error, insert error, new items)
- [x] Write cron refresh tests (9 tests: timing-safe auth, stale feeds, schedule detection, error handling)
- [x] Write reader SSRF tests (16 tests: rate limit, validation, SSRF blocklist for localhost/private/cloud metadata/IPv6, article extraction)
- [x] Write auth callback tests (8 tests: open redirect prevention for //, https://, ://, javascript:, + auth flow)
- [x] Write Stripe checkout/portal tests (7 tests: auth, profile lookup, customer creation, checkout URL, billing portal)
- [x] Write feeds/[id] CRUD tests (13 tests: GET auth/404/items/error, PATCH auth/validation/schedule limits/update, DELETE auth/404/success/error)

## Phase 12: Full API Test Coverage [DONE]
- [x] Write feeds export tests (7 tests: auth, 404, JSON format, RSS XML output, XML escaping, empty items, cache headers)
- [x] Write feeds stats tests (5 tests: auth, 404, source breakdown, empty feed, items per day)
- [x] Write feeds duplicate tests (4 tests: auth, 404, success with "(copy)" name, insert failure)
- [x] Write feeds discover tests (13 tests: rate limit, auth, validation, SSRF, RSS discovery from HTML, direct XML, empty feeds, fetch failure)
- [x] Write feeds import tests (7 tests: auth, invalid OPML, no feeds, valid import, plan limits, duplicate names, insert failure)
- [x] Write articles summarize tests (7 tests: rate limit, missing title, full response, positive/negative sentiment, missing URL, invalid JSON)
- [x] Write user stats tests (4 tests: auth, stats response, no feeds, account age)
- [x] Remove console.error from stats, duplicate, user/stats routes (production hygiene)

## Phase 13: Security Hardening Pass 2 + Production Hygiene [DONE]
- [x] Fix hardcoded URL in feed export — use NEXT_PUBLIC_APP_URL env var
- [x] Remove `unsafe-eval` from CSP header, add `upgrade-insecure-requests`
- [x] Add rate limiting to search endpoint (30 req/min per IP)
- [x] Fix NaN validation in search limit parameter
- [x] Remove summary from trending endpoint (prevent private data exposure)
- [x] Remove unused `@stripe/stripe-js` dependency
- [x] Remove console.error from 10 API routes (webhook, reader, embed, feeds CRUD, refresh, search)
- [x] Add rate limit test for search endpoint (413 total tests)
- [x] Fix TypeScript errors: `Request` → `NextRequest` in api-feeds.test.ts, `RequestInit` type mismatch

## Blocked Tasks (Need User Action)
- Set Stripe env vars on Vercel (Phase 4)
- Test end-to-end Stripe flow (Phase 4)
- Google OAuth setup in Supabase dashboard (Phase 5)
- Brave Search API key (Phase 5)
- Custom domain purchase (Phase 5)
- Set RESEND_API_KEY on Vercel (Phase 5)

## Success Metrics
- 100 users in first week
- 10 paying users in first month
- $500 MRR in 3 months
