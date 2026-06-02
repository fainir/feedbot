# FeedBot / MyFeed — Project Knowledge

> Durable operational reference. For the latest point-in-time state, see `handoff.md`.
> For the task log, see `plan.md`.

## What it is
**MyFeed** (myfeed.space) — AI-curated, mobile-first news feed. A user types any
prompt → gets a feed of relevant fresh content. ~103 system feeds (tabs + Explore)
+ arbitrary user feeds. Every feed is the same mechanism: a prompt.

## Stack & infra
- **Next.js 15** (App Router, React 19, Tailwind), standalone output.
- **Host:** Railway — project `feedbot` / env `production` / service `feedbot`.
  Auto-deploys on push to `main` (GitHub integration). Watch a deploy with
  `railway deployment list` (top row = newest; wait for `SUCCESS`).
  A failed build leaves the previous good deploy serving — the live site is not
  taken down by a bad build.
- **DB:** Supabase project `mdgzaizkjqbefovcgljr`, **FREE tier — IO/compute
  fragile**. Migrations via `supabase db push --linked`; verify with
  `supabase migration list --linked` (synced through 026).
- **Cron (split out — Phase 1 cost redesign, 2026-06-02):** a SEPARATE Railway
  service `feedbot-cron` (same repo/image, `SERVICE_ROLE=cron`, Cron Schedule
  `*/30 * * * *`, unexposed, vars via `${{feedbot.*}}` references) runs the
  loop and EXITS — a Railway Cron Job that scales to zero, so it bills only the
  ~minutes it runs instead of 24/7. The web service has `DISABLE_INPROCESS_CRON=1`
  so it no longer schedules the loop (stays warm, serves only, slimmer memory).
  - Mechanism: `src/instrumentation.ts` register() branches on env. Cron mode =
    `runOnceAndExit` (waitForServer → runCycle → time-gated `maybePrune` via
    scan_state `last_prune_at` ~3h → `process.exit`). Same loopback path as
    before (scan → classify → top-up → digests; phases hit
    `/api/cron/scan-and-match?phase=…`, `/api/cron/prune`).
  - Roll back: unset `DISABLE_INPROCESS_CRON` on web (in-process loop resumes),
    or delete `feedbot-cron`. The flag defaults OFF so the web path is intact.
  - Why: the bill is ~100% Railway memory; bundling the heavy loop with the
    always-on web server meant paying 24/7 for the cron's working set.
- **Secrets:** Railway env + local `.env.local` (NOT git): `CRON_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (gpt-4o-mini),
  `BRAVE_SEARCH_API_KEY` (free tier, often quota-exhausted), `NEXT_PUBLIC_APP_URL`.
  `REDIS_URL` is Railway-only (prod rate-limiting); not needed locally.

## How feeds get filled (two complementary, free-tier-safe mechanisms)
1. **Classify (shared pool → feeds)** — `src/lib/classify.ts` + `scan-and-match`.
   Scan ~237 RSS + Google News into `article_pool`; a lossless keyset cursor on
   `(created_at,id)` (migration 020) drains oldest-first; LLM matches articles to
   feeds (gpt-4o-mini, quality ≥65) → upsert into `feed_items`. No article skipped.
   "Umbrella" rule: AI & ML also receives LLM Research / AI Tools / Computer Vision.
2. **Demand-driven top-up (per-feed targeted search)** — `src/lib/feed-engine.ts →
   topUpStarvingFeeds()`, cron `phase=topup`. The fix for niche/new feeds.
   - `starving_feeds(min_fresh, max, since_hours)` RPC (migration 026): feeds with
     **< min_fresh items in the window**. Called with **minFresh=25, sinceHours=720
     (30d)**, maxFeeds=10 → returns the neediest ≤10 feeds (new feeds start at 0).
   - Per feed: targeted search on the **exact prompt** via **free** sources —
     localized Google News (detects Hebrew/Arabic/Russian/Japanese script) + Reddit
     search RSS — then `preFilterArticles` (free keyword+spam gate) → upsert.
   - **Brave is last-resort only** (free sources <10 AND quota allows); no-ops on 429.
   - `fetchRssItemsUA()` uses a browser User-Agent + `parseString` — rss-parser's
     default bot UA gets silently blocked by Reddit.
   - Self-regulating: a feed ≥25 items is skipped → rich feeds cost $0.
   - SLO = "a full scrollable 30d page", NOT "N fresh per 48h". Low-volume niches
     (drum covers) and vague one-word foreign prompts genuinely top out below 50.

## SEMANTIC PATH — DO NOT ENABLE on free tier
pgvector/HNSW embedding retrieval (migrations 021-025) was built then **reverted**:
it **saturated the free-tier DB** (incident — site feeds timed out; Supabase was
restarted to recover). Cron is back on lightweight classify. Embed/fill is
**env-gated behind `EVO_SEMANTIC=1`** — only enable on PAID Supabase compute, and
recreate the HNSW index if so. The HNSW index was dropped (migration 025).

## Free-tier Supabase rules (fragile — respect these)
- No bulk writes, no big VACUUM, don't hammer with parallel queries.
- One well-formed aggregate read is fine; many concurrent per-row queries are not.
- If the CLI mgmt API times out, use the dashboard SQL editor.
- For a safe full feed-health snapshot: call `starving_feeds` with a very high
  `p_min_fresh` (e.g. 100000) + `p_max` 500 → one aggregate returns every active
  feed with its fresh-30d count. (See the throwaway script pattern in a session.)

## Testing reality
- Test runner: **vitest** (`npm test` = `vitest run --dir src`). Config:
  `vitest.config.ts` (jsdom, globals).
- The original ~400-test suite was **deliberately stripped** in commit `4d3b54b`
  ("strip 58 unused components + all tests for Railway build"). With no test files,
  `npm test` exits 1 ("No test files found").
- `next.config.ts` sets `typescript.ignoreBuildErrors` + `eslint.ignoreDuringBuilds`
  = true, so test files / TS errors cannot break the Railway build. There are a few
  known pre-existing tsc errors (e.g. `public/feeds/route.ts`, `feed-card.tsx`).
- When adding a fix, prefer a small **pure-function** unit test (no Next/Supabase
  server imports) so it runs under vitest without build risk.

## Conventions
- **Commit AND push after every meaningful change** (work-loss prevention).
  `git status` before stopping. Pushing `main` = a prod deploy.
- Em dash is banned in all output — use a hyphen.
- Verify live: `curl https://myfeed.space/<slug>` and count `<article` tags. The
  container cold-starts when idle (first hit 15-30s; warm ~2s) — re-curl to tell
  cold-start from a real regression. Trigger cron phases with
  `Authorization: Bearer $CRON_SECRET`.
