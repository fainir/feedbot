# FeedBot / MyFeed — Session Handoff

_Last updated: 2026-05-30. Hand off to a new session on another machine._

## What this is
**MyFeed** (myfeed.space) — an AI-curated, mobile-first news feed. A user types any
prompt → gets a feed of relevant fresh content. ~103 system feeds (tabs + Explore) +
arbitrary user feeds. All feeds are the same mechanism: a prompt.

- **Repo:** https://github.com/fainir/feedbot.git (branch `main`, everything pushed)
- **Host:** Railway, project `feedbot` / env `production` / service `feedbot` (auto-deploys on push to main; Next.js 15 standalone)
- **DB:** Supabase project `mdgzaizkjqbefovcgljr` (**FREE tier — IO/compute constrained, treat as fragile**)
- **Cron:** in-process loop in `src/instrumentation.ts`, every 30 min: scan → classify → top-up → (digests). Phases hit `/api/cron/scan-and-match?phase=…` and `/api/cron/embed`, `/api/cron/prune`.
- **Secrets** live in Railway env + local `.env.local` (NOT in git): `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `OPENAI_API_KEY` (gpt-4o-mini), `BRAVE_SEARCH_API_KEY` (free tier, **quota exhausted this month — 2001/2000**), `REDIS_URL`.

## How feeds get filled NOW (the important part)
Two complementary mechanisms, both lightweight + free-tier-safe:

1. **Classify (shared pool → feeds):** `src/lib/classify.ts` + `scan-and-match` `classify()`.
   - Scan ~237 RSS + Google News into `article_pool`.
   - Lossless **keyset cursor** on `(created_at,id)` (migration 020) drains the pool oldest-first, LLM-matches articles to feeds (gpt-4o-mini, quality ≥65), upserts into `feed_items`. No article ever skipped.
   - "Umbrella" rule: AI & ML also receives LLM Research / AI Tools / Computer Vision matches.

2. **Demand-driven top-up (per-feed targeted search) — the fix for niche/new feeds:** `src/lib/feed-engine.ts → topUpStarvingFeeds()`, cron `phase=topup`.
   - `starving_feeds(min_fresh, max, since_hours)` RPC (migration 026) returns feeds with **<25 items in 30d** (neediest first; new feeds start at 0).
   - For each (≤10/tick): targeted search on the **exact prompt** via **free** sources — **localized Google News** (detects Hebrew/Arabic/Russian/Japanese script) + **Reddit search RSS** — then `preFilterArticles` (free keyword+spam gate) → upsert into `feed_items`.
   - **Brave is last-resort only** (when free sources return <10 AND quota allows); currently no-ops on 429, degrades gracefully.
   - Critical fix: `fetchRssItemsUA()` uses a browser User-Agent + `parseString` because rss-parser's default bot UA gets silently blocked by Reddit.
   - Self-regulating: once a feed crosses 25 items it's skipped → rich feeds cost $0.

## Verified state (2026-05-30)
- **All 126 active feeds: 0 empty, 0 thin, 120 full (50+ items), 6 at 25-49.**
- Live pages render 50 articles, fast (~1-2.5s): /ai, /dev, /gaming, /science, /personal-finance, /fintech, /economics.
- **New-feed flow tested end-to-end:** created a live "vintage watch restoration" feed → filled with 18+ relevant quality articles (NYT, Guardian, Gear Patrol) in one cycle, free. Cleaned up after.
- Cost: ~$0/day (free Google News + Reddit; Brave unused).

## This session's arc (context)
1. First-load speedup: SSR For You homepage, loopback fetch, SW stale-while-revalidate, image-size cap, cache key versioning (now `feeds:v4:`).
2. Disk-IO relief: scheduled prune (retention article_pool 7d / feed_items 30d), prune RPC, autovacuum tuning, cron 15→30min.
3. Freshness fix: lossless keyset cursor + drain loop (classify was permanently skipping >200/tick overflow), AI routing prompt, umbrella feeds.
4. **Semantic experiment + REVERT:** built pgvector/HNSW embedding retrieval (migrations 021-025) to make any prompt rich. It **saturated the free-tier DB (incident: site feeds timed out)**. Reverted: cron back to classify, embed/fill **env-gated behind `EVO_SEMANTIC=1`** (only enable on PAID compute), dropped HNSW index (migration 025). Supabase was **restarted** to recover.
5. **Demand-driven top-up** (the durable, cost-effective answer): migrations 026 + the topUp code above.

## Known caveats / open items
- **Brave quota exhausted** (resets monthly). Non-blocking — free sources cover it. If you want Brave coverage sooner, the user must upgrade the Brave plan (their billing).
- New feeds fill **within a cron cycle (≤30 min)**, not instantly.
- Ultra-vague one-word foreign prompts (e.g. Hebrew "חייזרים") top out ~24 items — that little distinct content exists. Real prompts get 50.
- `EVO_SEMANTIC=1` would re-enable the embedding path — **only do this on paid Supabase compute**, and recreate the HNSW index if so.
- Top-up item `source` field stores the Google-News feed title; the card's `getSourceInfo`/`extractTitleSource` extracts the real publisher from the title suffix for display (working, but verify if touching source display).

## Operating conventions
- **Commit AND push after every meaningful change** (user lost work before to uncommitted changes). `git status` before ending.
- **Free-tier Supabase is fragile** — avoid heavy/bulk DB writes, no big VACUUM, don't hammer with parallel queries. Use the browser SQL editor (dashboard) if the CLI mgmt API times out.
- Migrations: `supabase db push --linked`. The CLI is linked to the project. Verify with `supabase migration list --linked`.
- Verify live: `curl https://myfeed.space/<slug>` (count `<article` tags); trigger cron phases with `Authorization: Bearer $CRON_SECRET`.
- `.claude/plan.md` is the task log.

## Latest commits
```
2f50054 fix(topup): browser UA + parseString so Reddit actually returns items
981cc07 feat(topup): free multi-source targeted search — any prompt, any language
b9fb741 tune(topup): SLO = full 30d page, not 8-fresh-per-48h
8eabe87 feat(feeds): demand-driven top-up so EVERY feed gets good numbers
4c222ae chore(db): drop dormant HNSW index
9a97a9c fix(incident): revert cron to lightweight classify — embeddings too heavy for free-tier
```
