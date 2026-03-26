# FeedBot — Company Plan

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

## Phase 6: Polish + Quality [IN PROGRESS]
- [x] Public API with rate limiting (rate-limit.ts + API routes with auth)
- [x] RSS feed output per user feed (via /api/feeds/[id]/export?format=rss)
- [x] Onboarding flow for new users (onboarding-tour.tsx + getting-started page)
- [ ] Performance audit (bundle size, Core Web Vitals)
- [x] Error monitoring (ErrorBoundary component + Vercel Analytics already integrated)

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
