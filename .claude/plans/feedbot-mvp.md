# FeedBot — Personalized Feed Aggregator SaaS

## Vision
A SaaS where users create feed tabs, describe what they want in plain English, and the backend scans internet sources to build live custom feeds. Notifications via email, push, and WhatsApp.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API routes + server actions
- **Database**: PostgreSQL via Supabase (free tier)
- **Auth**: TBD (user will help)
- **Payments**: Stripe (subscriptions)
- **Email**: Resend (free tier: 3k/month)
- **WhatsApp**: Twilio WhatsApp API
- **Web scraping/feeds**: RSS parsing + web search API + AI summarization
- **Deployment**: Vercel (free tier for MVP)
- **Job scheduling**: Vercel Cron or Inngest

## Task Tree

### Phase 1: Project Scaffold
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Set up Tailwind CSS + shadcn/ui
- [ ] Set up project structure (app/, lib/, components/, types/)
- [ ] Create .env.example with all required env vars
- [ ] Set up Supabase project + database schema
- [ ] Create database migration files

### Phase 2: Database Schema
- [ ] Users table (id, email, name, plan, stripe_customer_id, created_at)
- [ ] Feeds table (id, user_id, name, description, query_text, schedule, created_at)
- [ ] Feed items table (id, feed_id, title, url, summary, source, published_at, created_at)
- [ ] Notifications table (id, user_id, feed_id, channel, status, sent_at)
- [ ] Subscriptions table (id, user_id, stripe_subscription_id, plan, status, current_period_end)

### Phase 3: Core UI
- [ ] Landing page with hero, features, pricing
- [ ] Dashboard layout (sidebar with feed tabs)
- [ ] Feed creation modal (free text input)
- [ ] Feed view (card list of items with title, summary, source, time)
- [ ] Feed settings (edit query, schedule, notification preferences)
- [ ] Responsive mobile layout

### Phase 4: Feed Engine (Backend)
- [ ] RSS feed discovery and parsing (given a topic)
- [ ] Web search integration (search API for fresh results)
- [ ] AI summarization of feed items (OpenAI or Claude API)
- [ ] Feed refresh job (cron-based, respects schedule per feed)
- [ ] Natural language query → search terms conversion

### Phase 5: Notifications
- [ ] Email notifications via Resend
- [ ] Browser push notifications (Web Push API)
- [ ] WhatsApp notifications via Twilio
- [ ] Notification preferences per feed (channel, frequency)
- [ ] Digest mode (daily summary vs real-time)

### Phase 6: Payments (Stripe)
- [ ] Stripe integration (checkout, webhooks, customer portal)
- [ ] Pricing plans: Free (3 feeds, daily refresh), Pro ($9/mo, unlimited, hourly, all notifications)
- [ ] Subscription management UI
- [ ] Usage limits enforcement
- [ ] Webhook handler for subscription events

### Phase 7: Auth
- [!] User will provide auth approach — blocked until input

### Phase 8: Deployment
- [ ] Configure Vercel project
- [ ] Set up environment variables
- [ ] Deploy to production
- [ ] Set up custom domain (if provided)
- [ ] Verify Stripe webhooks in production
- [ ] Test full flow end-to-end

### Phase 9: Polish
- [ ] Error handling and loading states
- [ ] SEO meta tags and OG images
- [ ] Rate limiting on API routes
- [ ] Analytics (Vercel Analytics or Plausible)

## Pricing
| Plan | Price | Feeds | Refresh | Notifications |
|------|-------|-------|---------|---------------|
| Free | $0 | 3 | Daily | Email only |
| Pro | $9/mo | Unlimited | Hourly | Email + Push + WhatsApp |

## Change Log
- 2026-02-28: Initial plan created
