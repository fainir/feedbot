# MyFeed Strategy

## Vision
AI-powered personalized feed aggregator that lets users describe what they care about in plain English and get a real-time, curated feed from across the internet.

## Target Users

| User Type | Need | Priority |
|-----------|------|----------|
| Tech professionals | Stay current on AI/ML, programming, cloud without noise | HIGH |
| Founders/PMs | Track industry trends, competitors, startup ecosystem | HIGH |
| Researchers | Monitor specific topics (AI safety, climate tech, biotech) | MEDIUM |
| News junkies | One place for all interests, better than Twitter/Reddit | MEDIUM |

## Goals & Success Criteria

| Goal | Metric | Target | Current |
|------|--------|--------|---------|
| User acquisition | Registered users | 100 by May 2026 | 3 |
| Engagement | DAU/MAU ratio | >20% | Measuring |
| Retention | Week-1 retention | >40% | Measuring |
| Revenue | MRR | $500 by June 2026 | $0 (payments not wired) |
| Content quality | Avg article score | >75/100 | ~80 |
| Feed freshness | Articles <24h old | >60% | ~70% |

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15.5, React 19, Tailwind 4 | Fast SSR, modern React, utility CSS |
| Backend | Next.js API routes + server actions | Single codebase, no separate server |
| Database | Supabase (PostgreSQL) | Auth + DB in one, generous free tier |
| AI | Claude Haiku (scoring), Claude (search plans) | Cheapest per-token for batch scoring |
| Hosting | Railway | User preference, good DX, instrumentation hooks |
| Payments | Lemon Squeezy | Simpler than Stripe, built-in tax handling |
| Email | Resend | Developer-friendly, good deliverability |
| Analytics | GA4 + Mixpanel | GA for SEO, Mixpanel for product analytics |
| Domain | myfeed.space | Short, memorable, available |

## Competitive Landscape

| Competitor | Strength | MyFeed Advantage |
|-----------|----------|-----------------|
| Feedly | Large RSS library, team features | AI scoring, natural language feed creation |
| Google News | Massive scale, personalization | Custom topic precision, no algorithmic bias |
| Twitter/X Lists | Real-time, social context | No noise, curated quality, email digests |
| Artifact (RIP) | Good UX, AI curation | Still alive, self-hosted, customizable |
| Perplexity Discover | AI summaries | Per-topic feeds, not just trending |

## Key Constraints
- Solo founder — must prioritize ruthlessly
- Railway free/hobby tier — build times <2min, modest compute
- No SMTP yet — email digests blocked on RESEND_API_KEY
- Early stage — need to validate PMF before scaling features

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AI scoring costs scale with users | HIGH | MEDIUM | Batch scoring, cache results, Haiku is cheap |
| RSS sources go stale/break | MEDIUM | HIGH | Monitor source health, auto-disable broken feeds |
| Users don't create custom feeds | HIGH | MEDIUM | Public tabs as showcase, prompt passthrough on signup |
| Lemon Squeezy integration issues | HIGH | LOW | Code exists, just needs env vars and testing |
| Railway downtime | MEDIUM | LOW | Stateless app, DB on Supabase (separate infra) |

---
*Created: 2026-04-03 | Last Updated: 2026-04-03*
