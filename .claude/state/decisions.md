# Key Decisions
**Updated**: 2026-04-03

## Architecture: Scan Once, AI-Match Per Feed
**Decision**: Global article pool scanned from RSS → AI scores per feed prompt
**Why**: Scanning per-feed is wasteful (same sources hit N times). Pool = scan once, serve many.
**Alternatives rejected**: Per-feed RSS fetching (old approach, duplicated work)

## AI Scoring: Claude Haiku with Strict Prompt
**Decision**: Use Haiku (cheapest) with explicit trap rules in the prompt
**Why**: Haiku is 10x cheaper than Sonnet, fast enough for batch scoring
**Cost**: ~$0.05 per cron run for 23 feeds

## Prompt Intelligence: AI Generates Search Plans
**Decision**: When feed is created, AI generates optimized search queries, cached in DB
**Why**: User prompts are natural language; RSS needs specific queries. AI bridges the gap.
**Cost**: ~$0.003 per feed creation (one-time)

## 18 Public Tabs
**Decision**: Pre-created system feeds covering major categories
**Why**: Users need content immediately without signing up. Showcases the product.

## Auto-cron via Instrumentation Hook
**Decision**: Next.js instrumentation hook with setInterval(15min)
**Why**: No external cron service needed. Runs as long as the Railway container is up.
**Alternative**: cron-job.org (free external) — available as backup

## Domain: myfeed.space (root, not www)
**Decision**: User explicitly chose root domain as canonical
**Redirect**: www → root via Next.js redirects config
**DNS**: ALIAS record on Namecheap for root, CNAME for www + TXT verification records
