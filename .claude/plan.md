# FeedBot — Company Plan

## Active
- [x] Light mode color fix — gray page bg, white card bg (S)
- [x] Add text labels to like/dislike buttons (S)
- [x] White header bar in light mode (S)
- [x] Favicon — dark bg, bold white letters (S)
- [x] Add Compass icon to Explore button (S)
- [x] Change Explore icon from Compass to Search (S)
- [x] Add more public feeds (M)
- [x] Restructure feeds — 15 default tabs, 100+ on Explore (L)
- [x] Add queries to all 100 Explore feeds so they fetch articles (L)
- [x] Fix empty feeds — search article_pool for feeds not in DB (M)
- [x] Seed all 103 system feeds into DB so they use the same pipeline as user feeds (L)
- [x] For You customize — toggle feeds on/off, show-all toggle (M)
- [x] Show All toggle UX — clicking a chip turns off toggle, toggling back selects all (S)
- [x] Tighter tabs — X overlays on hover instead of taking space (S)
- [x] Match divider styles — For You divider and Explore left divider same style (S)
- [x] X button on right side of tab, not overlay center (S)
- [x] Reduce action button padding + video embed support (M)
- [x] Add Brave Video Search to get YouTube content into feeds (M)
- [x] Rewrite pipeline: scan-all → 2-pass AI classify (Sonnet 4.6) → multi-feed insert (XL)
- [x] Add 100+ RSS sources across all categories (L)
- [x] Fix AI model ID for classification pipeline (S)
- [x] Switch to Haiku (confirmed working on this API key) + add debug logging (S)
- [x] Switch classification pipeline from Haiku to GPT-5 Nano (M)
- [x] Fix JSON schema — add additionalProperties: false (S)
- [x] Add YouTube channel RSS feeds + remove Brave rotation limits (M)
- [x] Fix pipeline timeout — parallelize AI calls, reduce batch size (M)
- [x] Fix AI matching — use integer indices instead of UUIDs for feed matching (S)
- [x] Split pipeline into scan/classify phases to stay under timeout (M)
- [x] Switch to gpt-5-nano ($0.05/1M tokens, cheapest option) (S)
- [x] Fix mobile tab close — X button triggers on tap instead of just hover (S)
- [x] Feed quality improvements — filter junk, better summaries, dedup, source icons (L)
- [x] Replace "articles" with "finds/posts/content" in all user-facing copy (S)
- [x] Feed quality pass 2 — fix Reddit/Medium cruft, more spam filters, dedup (M)
- [x] Feed quality pass 3 — crypto scams, ad copy, non-English filters (S)
- [x] Feed quality pass 4 — source diversity, personalization, freshness, dedup, favicons, trending, video, summaries, DEV scoring (XL)
- [x] Fix remaining casino/slot spam in Gaming feed (S)
- [x] Pre-release fixes — Spanish filter, broken imgs, source names, remove crypto tab, more video, accent fix (L)
- [x] UI/UX polish — remove gradient placeholders, consistent image ratio, visible More/Less labels, tab fade, card hover, freshness indicator, explore footer (M)
- [x] Feed content quality pass 5 — fix open-source feed, non-English filter, source diversity, spam filters, page title bug, story clustering, Wikipedia filter (XL)
- [x] Feed quality pass 6 — tighten accent threshold, API-level spam filter, QA next batch (S)
- [x] Feed quality pass 7 — fix custom feed relevance, homepage diversity, Day X filter, open-source feed (L)
- [x] Feed quality pass 8 — smart feed matching with keyword overlap scoring (M)
- [x] Feed matching rewrite — TF-IDF weighted feed index + multi-feed merge + within-feed re-ranking (L)
- [x] Rewrite classify pipeline — single pass, articles + feed prompts → AI matches → insert (M)
- [x] Add quality gate to LLM classify prompt — skip spam, promo, low-quality (S)
- [x] Fix instrumentation.ts log fields + test cron results (S)
- [x] Tighten LLM classify prompt + fix diversity cap (S)
- [x] Rewrite LLM prompt — user intent framing + quality scoring (M)
- [x] Instant custom feed + LLM summaries (L)
- [x] Fix instant classify — batch size, index alignment, dedup (S)
- [x] Fix custom feed tab bug — private feeds crash on /[slug] route (S)
- [x] Fix tab bar scroll — remove mask that blocks scrolling (S)
- [x] Email CTA for guests — inline card + bottom CTA (S)
- [x] Signup flows — auto-create feed from prompt, auto-enable email from CTA (S)
- [x] Fix email flow — fix /api/email-preferences endpoint (S)
- [x] Fix email sending — use Resend default domain until DNS verified (S)
- [x] Debug email_preferences table insert failure — UUID filter fix (S)
- [x] Email digest shows For You content from system feeds (S)
- [x] Digest = For You only — system feeds, selectable like For You filter (S)
- [x] Redesign feed headers — full-width, email CTA card for guests + users (M)
- [x] Move banners under header, not above (S)
- [x] For You header matches tab header button style (S)
- [x] For You header: Customize + Refresh, no Share (S)
- [x] Email CTA in header, not separate banner — different for guest/user (M)
- [x] Chill header buttons (no borders) + better hero banner copy (S)
- [x] Header tweaks — hide stats, show prompt, horizontal chips, better hero copy (M)
- [x] Header layout: 2 rows — title+actions top, chips+customize bottom (S)
- [x] Feed tab headers: 2-row layout with prompt text + Customize (S)
- [x] For You: remove Customize from chips row, chips are the customization (S)
- [x] Fix Customize button always visible — pinned outside scroll area (S)
- [x] Chips label + rename For You to better explain aggregation (S)
- [x] Create feed button uses Sparkles icon instead of Plus (S)
- [x] Smaller chip padding (S)
- [x] Better guest banner — explain product, more noticeable yet clean (S)
- [x] Replace em dash with hyphen in user-facing text (S)
- [x] CSS polish from designer reference — spacing, colors, card styles, chip styles (M)
- [x] Replace Sparkles overuse + chips scroll + header bg fix (S)
- [x] Smaller chips (S)
- [x] My Feed icon + revert Customize to Sparkles (S)
- [x] Feed header matches My Feed style, MF icon fix, chips margin-right alignment (S)
- [x] Smaller email button + smaller banner input/button (S)
- [x] Bigger top nav bar + items (S)
- [x] Round Create my feed button + lighter banner bg (S)
- [x] MF icon tighter — less padding between text and edges (S)
- [x] Faster tab navigation — prefetch on hover + cache visited feeds (M)
- [x] Banner unique bg + theme default from system with localStorage persist (S)
- [~] Fix banner dark mode gradient (S)

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
