# Feedbot — Source of Truth

## Stack: Railway + Supabase + Lemon Squeezy

## Status: LIVE AND WORKING (2026-04-02)
- ✅ Railway deployed: https://feedbot-production.up.railway.app
- ✅ Supabase connected: 2 users, 4 feeds, 26 articles
- ✅ Auth: signup + login working
- ✅ Feed creation: working via API
- ✅ Feed refresh: cron generates articles (RSS + mock fallback)
- ✅ Landing page: serving
- ❌ Browser auth flow: needs testing with Chrome
- ⚠️ Brave Search: optional (RSS works without it — Google News, Reddit, HN, Medium)
- ❌ Lemon Squeezy: needs keys for payments
- ❌ Resend: needs key for email notifications

## Demo Account
- Email: demo@feedbot.test / Password: demo123456
- Has 4 feeds: AI News, Tech Startups, Climate Science, Coding Tips

## Next Priority
1. Get Brave Search API key → real web results instead of mock
2. Test browser login flow
3. Set up Lemon Squeezy payments
4. Add back stripped pages gradually
