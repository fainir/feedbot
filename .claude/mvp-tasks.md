# MyFeed MVP Release — Task List
**CEO**: Best Agent | **Founder**: Nir | **Date**: 2026-04-03

## Goal
Ship a product people can pay for. Not perfect — viable. A user should be able to:
1. Land on myfeed.space → see quality public feeds → be impressed
2. Create a custom feed from a prompt → see it fill with relevant content
3. Pay to keep their custom feed + get email digests
4. Come back daily because the content is genuinely good

---

## P0 — MUST SHIP (Blocks revenue or breaks core experience)

### 1. Fix Payment System (Lemon Squeezy)
- [ ] Add `lemon_subscription_id` column to profiles table (migration)
- [ ] Remove/rename `stripe_customer_id` and `stripe_subscription_id` references
- [ ] Verify webhook handler works end-to-end (create checkout → webhook → profile updated)
- [ ] Create pricing page at /pricing with Free vs Pro tiers
- [ ] Add paywall gate: free users get 1 custom feed, pro gets unlimited
- [ ] Add "Upgrade to Pro" CTA in dashboard and on feed creation limit
- [ ] Set Lemon Squeezy env vars on Railway (LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID, LEMONSQUEEZY_WEBHOOK_SECRET)
- **DoD**: A user can go Free → Pro via Lemon Squeezy checkout, webhook updates their plan, and they can create unlimited feeds.

### 2. Fix Email Digest System
- [ ] Create `email_preferences` table migration (columns: user_id, digest_enabled, frequency, last_digest_at)
- [ ] Verify `search_plan` column exists on feeds table (run migration 005 if needed)
- [ ] Create /api/cron/digest route that calls sendDigests()
- [ ] Add digest trigger to auto-cron (instrumentation hook) or cron-job.org
- [ ] Set RESEND_API_KEY on Railway
- [ ] Add email preference toggle in dashboard settings
- **DoD**: Pro users receive email digests at their chosen frequency with relevant articles.

### 3. Feed Quality Audit
- [ ] Run scan-and-match manually, check article quality across all 18 tabs
- [ ] Verify AI scoring actually runs (check ANTHROPIC_API_KEY is set on Railway)
- [ ] Check that articles are recent (not stale/weeks old)
- [ ] Ensure custom feed creation → AI search plan → targeted scan → scoring pipeline works E2E
- [ ] Fix any tabs with zero or low-quality content
- **DoD**: Every public tab has 10+ relevant, recent articles. Custom feeds score well.

### 4. Fix Critical UX Bugs
- [ ] Verify signup → prompt passthrough → feed creation → redirect works on prod
- [ ] Test Google OAuth signup with prompt passthrough
- [ ] Check mobile responsiveness (320px minimum)
- [ ] Fix any 404s or broken links in navigation
- [ ] Ensure "Building your feed..." state works and auto-refreshes
- **DoD**: A new user can sign up with a prompt, see their feed being built, and view articles within 2 minutes.

---

## P1 — SHOULD SHIP (Significant quality/conversion impact)

### 5. Pricing Page
- [ ] Create /pricing route with Free vs Pro comparison table
- [ ] Free: 18 public tabs, 1 custom feed, no email digests
- [ ] Pro: Unlimited custom feeds, email digests, priority scanning, platform connectors
- [ ] Price point: $5-9/mo (research competitors first)
- [ ] "Start Free" and "Go Pro" CTAs
- [ ] FAQ section (What is MyFeed? How does AI work? Can I cancel?)
- **DoD**: /pricing looks professional and communicates clear value.

### 6. Landing Page Polish
- [ ] Hero section: headline + subheadline + CTA + demo feed preview
- [ ] Social proof section (even if placeholder: "Join 100+ early users")
- [ ] How it works: 3 steps (Describe → AI curates → Read)
- [ ] Feature highlights with icons
- [ ] Footer with links (Pricing, Login, Privacy, Terms)
- **DoD**: myfeed.space homepage converts visitors to signups.

### 7. SEO & Meta Tags
- [ ] Unique meta title + description per public tab ("/ai" → "AI & ML News Feed")
- [ ] OpenGraph images per route (og:image, twitter:card)
- [ ] Structured data (JSON-LD for WebSite, ItemList)
- [ ] sitemap.xml includes all 18 public tabs
- [ ] robots.txt allows crawling
- [ ] Canonical URLs set correctly
- **DoD**: Google can index all public feeds. Sharing a link shows rich preview.

### 8. Article Card Quality
- [ ] Fetch OG images for articles missing cover images (og:image meta tag)
- [ ] Fallback: generate gradient placeholder with source name
- [ ] Truncate long titles/summaries elegantly
- [ ] Show relative timestamps ("2h ago", "yesterday")
- [ ] Source favicon/logo next to source name
- **DoD**: Every article card looks polished with image, clean text, and source attribution.

### 9. Analytics & Monitoring
- [ ] Add Plausible or PostHog (privacy-friendly, free tier)
- [ ] Track: page views, signups, feed creations, article clicks, upgrade clicks
- [ ] Add /api/health endpoint for uptime monitoring
- [ ] Set up UptimeRobot or similar (free) for myfeed.space + cron endpoint
- [ ] Error tracking: Sentry free tier for production errors
- **DoD**: I can see how many users visit, sign up, and use the product daily.

---

## P2 — NICE TO HAVE (Polish, but won't block launch)

### 10. Dashboard Cleanup
- [ ] Remove or stub dashboard/discover (mock data → "Coming soon")
- [ ] Remove or stub dashboard/notifications (not wired)
- [ ] Ensure dashboard/settings works for feed preferences
- [ ] Ensure dashboard/account shows plan status and upgrade CTA
- [ ] Add "My Feeds" list with create/delete/edit

### 11. Legal Pages
- [ ] Privacy Policy (/privacy) — data we collect, how AI works, no selling data
- [ ] Terms of Service (/terms) — standard SaaS terms
- [ ] Cookie policy (minimal — we barely use cookies)

### 12. Email Templates
- [ ] Welcome email after signup
- [ ] Digest email template polish (branded, mobile-friendly)
- [ ] Payment confirmation email
- [ ] Cancellation email

### 13. Platform Connector UI
- [ ] OAuth connect buttons in dashboard for GitHub, Bluesky, Mastodon
- [ ] Show connected platforms with disconnect option
- [ ] Use platform signals to boost feed relevance
- [ ] Skip YouTube and Reddit connectors for MVP (API complexity)

### 14. Performance
- [ ] Lazy load article images (loading="lazy")
- [ ] Implement infinite scroll pagination (if not already)
- [ ] Cache public feed responses (60s TTL)
- [ ] Optimize RSS fetch timeouts (5s max per source)

---

## Launch Checklist (After all P0 + most P1 done)

- [ ] Manual QA: full user flow on desktop + mobile
- [ ] Payment test: real Lemon Squeezy checkout (test mode)
- [ ] Email test: real digest arrives in inbox
- [ ] Check Railway logs for errors
- [ ] Share on: Product Hunt, Hacker News, Twitter/X, Reddit r/SideProject
- [ ] Write launch post: "I built an AI feed reader in a weekend"
- [ ] Set up feedback channel (email, Twitter DMs, or simple form)

---

## Effort Estimates

| Task | Effort | Revenue Impact |
|------|--------|---------------|
| P0: Payments | 2-3 hours | CRITICAL — enables revenue |
| P0: Email digests | 1-2 hours | HIGH — key Pro feature |
| P0: Feed quality audit | 1 hour | HIGH — product quality |
| P0: UX bugs | 1 hour | HIGH — conversion |
| P1: Pricing page | 1-2 hours | HIGH — conversion |
| P1: Landing page | 2-3 hours | HIGH — first impression |
| P1: SEO | 1-2 hours | MEDIUM — organic growth |
| P1: Article cards | 1-2 hours | MEDIUM — polish |
| P1: Analytics | 1 hour | MEDIUM — decision making |
| P2: All | 4-6 hours | LOW — nice to have |

**Total P0**: ~5-7 hours
**Total P0+P1**: ~12-16 hours
**Total everything**: ~20-25 hours

---

## Priority Order (what to work on first)

1. **Payments** — no revenue without this
2. **Feed quality audit** — bad content = no retention
3. **Pricing page** — nowhere to convert without this
4. **UX bugs** — broken flows kill signups
5. **Email digests** — key Pro differentiator
6. **Landing page** — first impression
7. **SEO** — organic discovery
8. **Article cards** — polish
9. **Analytics** — track what matters
10. **Everything else** — after launch
