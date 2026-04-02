# Feedbot — Source of Truth

## Stack (AUTHORITATIVE — always follow this)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL) — https://mdgzaizkjqbefovcgljr.supabase.co
- **Auth**: Supabase Auth
- **Payments**: Lemon Squeezy (NOT Stripe, NOT PayPal)
- **Deployment**: Railway (NOT Vercel, NOT Fly, NOT Render)
- **Domain**: feedbot-production.up.railway.app
- **Email**: Resend
- **Search**: Brave Search API

## Current Status (2026-04-02)
- Supabase: ONLINE, tables exist, schema applied
- Railway: deploying stripped MVP (10 pages, was 31)
- Lemon Squeezy: code integrated, needs API keys
- Landing page: built
- Dashboard: built (stripped to essential pages)
- Feed engine: built
- Auth: needs testing
- Build: stripped from 31→10 pages to fit Railway build timeout

## Decisions Log
- 2026-04-02: Strip non-essential pages for Railway build (blog, faq, analytics, etc.)
- 2026-04-02: Use Railway, NOT Vercel (user directive)
- 2026-04-02: Use Lemon Squeezy, NOT Stripe (user directive)
- 2026-04-02: Use nixpacks.toml with 3GB NODE_OPTIONS
- standalone output in next.config.ts

## NEVER DO
- Never deploy to Vercel
- Never use Stripe
- Never suggest switching platforms
