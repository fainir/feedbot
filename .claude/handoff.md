# Context Handoff
*Auto-generated: 2026-05-29T11:50:14Z*
*Session tool calls: ? | Branch: main*

## Plan Progress
Done: 198 | In Progress: 1 | Todo: 2 | Total: 201

## Active Tasks (RESUME THESE)
172:- [~] Feed freshness: lossless keyset cursor + drain loop + AI-routing prompt fix (M)

## Next Pending Tasks
168:- [ ] Set Stripe env vars on Vercel (sk_test, pk_test, whsec, price_id)
169:- [ ] Test end-to-end Stripe flow

## Blocked Tasks
175:- [!] Google OAuth provider setup in Supabase — BLOCKED: needs Supabase dashboard config
176:- [!] Brave Search API key for real content — BLOCKED: needs API key
178:- [!] Custom domain (feedbot.app?) — BLOCKED: needs domain purchase

## Process State
No process-maker.json found

## Recent Commits
21f5dc1 fix(classify): only classify articles published within last 7 days
40cd163 fix(ingest): drop articles older than 7 days at insertToPool
bb25239 fix(cache): bump key v2→v3 + never cache empty responses
edf8e49 fix(db): drop article_pool FK, bulk-prune backlog, simplify prune route
9117691 fix(prune): use a SECURITY DEFINER SQL function to bypass 8s timeout

## Uncommitted Changes
### Staged
None

### Modified
.claude/handoff.md
.claude/plan.md
src/app/api/cron/scan-and-match/route.ts
src/lib/classify.ts

## What the Next Session Should Do
1. Read .claude/plan.md — find [~] tasks and continue them
2. Read .claude/process-state.json — check for overdue/failed processes
3. If no [~] tasks, pick next [ ] from plan.md
4. Update progress.md after completing work
