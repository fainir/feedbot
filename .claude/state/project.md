# Feedbot — Source of Truth

## Stack (AUTHORITATIVE)
- **Deployment**: Railway — https://feedbot-production.up.railway.app
- **Database**: Supabase — https://mdgzaizkjqbefovcgljr.supabase.co
- **Auth**: Supabase Auth (email/password)
- **Payments**: Lemon Squeezy
- **Email**: Resend
- **Search**: Brave Search API

## Status: LIVE (2026-04-02)
- ✅ Railway: deployed, HTTP 200
- ✅ Supabase: connected, 2 users
- ✅ Landing page: working
- ✅ Login page: loads
- ✅ Auth: signup + login work via API
- ✅ Dashboard redirect: works (307 → login)
- ✅ API protection: returns 401 without auth
- ✅ Waitlist: accepts signups
- ❌ Feed creation: needs browser auth (cookie-based)
- ❌ Brave Search: needs API key on Railway
- ❌ Lemon Squeezy: needs API keys
- ❌ Resend: needs API key

## Demo Account
- Email: demo@feedbot.test
- Password: demo123456

## Next: set API keys on Railway, test in browser
