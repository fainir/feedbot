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

## Current Status
- Supabase: ONLINE, tables exist
- Railway: deploying with nixpacks (3GB memory build)
- Lemon Squeezy: code integrated, needs API keys configured
- Landing page: built
- Dashboard: built
- Feed engine: built
- Auth: needs testing

## Decisions Log
- 2026-04-02: Use Railway, NOT Vercel (user directive)
- 2026-04-02: Use Lemon Squeezy, NOT Stripe (user directive)
- 2026-04-01: Supabase for database (existing project)
- nixpacks.toml with 3GB memory for build
- standalone output in next.config.ts

## NEVER DO
- Never deploy to Vercel
- Never use Stripe
- Never suggest switching platforms
