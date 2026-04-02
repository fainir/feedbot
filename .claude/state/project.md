# Feedbot — Source of Truth

## Stack (AUTHORITATIVE)
- **Frontend**: Next.js 14 + Tailwind + shadcn/ui
- **Database**: Supabase — https://mdgzaizkjqbefovcgljr.supabase.co
- **Auth**: Supabase Auth
- **Payments**: Lemon Squeezy
- **Deployment**: Railway — https://feedbot-production.up.railway.app
- **Email**: Resend
- **Search**: Brave Search API

## Status: LIVE (2026-04-02)
- Railway: DEPLOYED, serving HTTP 200
- Supabase: ONLINE
- Landing page: WORKING
- Dashboard: needs auth testing
- Feed engine: needs API keys (Brave Search)
- Lemon Squeezy: needs API keys

## What Shipped
- Stripped from 198→96 source files for Railway build
- Stubbed 60+ unused components
- Removed Stripe completely, replaced with Lemon Squeezy
- nixpacks.toml with 3GB memory

## Next Steps
- [ ] Test auth flow (signup → login → dashboard)
- [ ] Set up Lemon Squeezy store + API keys
- [ ] Set up Brave Search API key for feed generation
- [ ] Set up Resend API key for email notifications
- [ ] Test feed creation end-to-end
- [ ] Add back stripped pages after MVP stable

## NEVER DO
- Never deploy to Vercel
- Never use Stripe
