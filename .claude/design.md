# MyFeed Architecture & Design

## System Architecture

```
User Browser
    ↓ HTTPS
Next.js App (Railway)
    ├── Pages (SSR/SSG)
    │   ├── /[feed] — 18 public feed tabs
    │   ├── /my/[id] — Custom feed view
    │   ├── /login — Auth with prompt passthrough
    │   └── /dashboard — User settings, feeds
    ├── API Routes
    │   ├── /api/cron/scan-and-match — Pipeline trigger
    │   ├── /api/feeds/* — CRUD + refresh
    │   ├── /api/reactions — Thumbs up/down
    │   ├── /api/bookmarks — Save articles
    │   └── /api/payments/webhook — Lemon Squeezy
    └── Instrumentation Hook (every 15 min)
            ↓
    ┌─────────────────────┐
    │ 3-Phase Pipeline     │
    │ 1. SCAN (RSS→Pool)   │──→ 23+ RSS Sources
    │ 2. MATCH (AI Score)  │──→ Claude Haiku API
    │ 3. INSERT (→Feeds)   │
    └─────────────────────┘
            ↓
    Supabase (PostgreSQL)
    ├── profiles, feeds, feed_items
    ├── article_pool, reactions, bookmarks
    └── email_preferences
```

## Data Model

### Core Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `profiles` | id, email, plan, lemon_subscription_id | User accounts |
| `feeds` | id, user_id, name, query_text, search_plan, is_public, last_refreshed_at | Feed definitions |
| `article_pool` | id, title, url, summary, source, image_url, published_at, category | Global article store |
| `feed_items` | id, feed_id, article_id, score, created_at | Scored article-feed matches |
| `reactions` | id, user_id, feed_id, article_id, reaction_type | User feedback |
| `bookmarks` | id, user_id, article_id, created_at | Saved articles |
| `email_preferences` | id, user_id, digest_enabled, frequency, last_digest_at | Digest settings |

### Key Relationships
- `feeds` → `profiles` (many-to-one)
- `feed_items` → `feeds` + `article_pool` (junction)
- `reactions` → `profiles` + `feeds` + `article_pool`

## API Contracts

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/cron/scan-and-match` | POST | Run pipeline | CRON_SECRET |
| `/api/feeds` | GET/POST | List/create feeds | Supabase JWT |
| `/api/feeds/[id]` | GET/DELETE | Feed details/delete | Supabase JWT |
| `/api/feeds/[id]/refresh` | POST | Force refresh | Supabase JWT |
| `/api/reactions` | GET/POST | List/create reactions | Supabase JWT |
| `/api/bookmarks` | GET/POST/DELETE | Manage bookmarks | Supabase JWT |
| `/api/email-preferences` | GET/PUT | Digest settings | Supabase JWT |
| `/api/payments/webhook` | POST | Lemon Squeezy events | Webhook secret |

## Component Hierarchy

```
RootLayout
├── Header (logo, nav, auth button)
├── FeedPage (/[feed])
│   ├── FeedTabs (18 public categories)
│   ├── ArticleList
│   │   └── ArticleCard (title, summary, source, image, reactions)
│   └── LoadMore (infinite scroll)
├── CustomFeedPage (/my/[id])
│   ├── FeedHeader (name, refresh, share)
│   ├── ArticleList (same component)
│   └── LoadMore
├── LoginPage
│   ├── AuthForm (email/password + Google OAuth)
│   └── PromptPassthrough (create feed on signup)
└── DashboardPage
    ├── MyFeeds (list + create)
    ├── Settings (email preferences)
    └── Account (plan, billing)
```

## Key Algorithms

### Prompt Intelligence
User prompt → Claude generates search plan:
- Google News queries (3-5 variations)
- Reddit subreddits (2-4 relevant)
- HackerNews keywords
- Medium/Dev.to tags
- Include/exclude terms
- Quality guidance for scorer

### AI Scoring
For each (article, feed) pair:
- Claude Haiku reads article title + summary + feed prompt
- Scores 0-100 on relevance
- Source quality boost applied (+20 HN, +15 TechCrunch, etc.)
- Threshold: 70+ to appear in feed

## State Management
- Server: Supabase for all persistent data
- Client: React state + SWR/fetch for data loading
- Auth: Supabase client-side session + server-side middleware
- No global state management library needed

---
*Created: 2026-04-03 | Last Updated: 2026-04-03*
