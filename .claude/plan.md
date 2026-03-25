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

## Phase 1: MVP (This Session)
- [ ] Tabs UI: "All" tab + "+" button to add custom tabs
- [ ] Tab creation: name + prompt input
- [ ] Feed generation: use web search to find content matching prompt
- [ ] Feed display: cards with title, summary, source, timestamp
- [ ] Local storage for tabs (no auth yet)
- [ ] Deploy to Vercel

## Phase 2: Auth + Persistence
- [ ] Supabase auth (email + Google)
- [ ] Save tabs to DB
- [ ] Cron job: refresh feeds daily
- [ ] Email digest for Pro users

## Phase 3: Monetization
- [ ] Stripe integration
- [ ] Free/Pro/Team tiers
- [ ] Usage tracking
- [ ] Landing page with pricing

## Success Metrics
- 100 users in first week
- 10 paying users in first month
- $500 MRR in 3 months
