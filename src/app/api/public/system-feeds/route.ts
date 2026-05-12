import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";

// In-memory cache: the system feed list barely changes, so we trade 5 min of
// staleness for sub-ms response on every email-prefs page load.
let _cache: { body: string; expiresAt: number } | null = null;
const TTL_MS = 5 * 60_000;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Lightweight public list of system feeds (id + name + slug). Used by the
 * email-preferences UI to map its slug-keyed FEEDS constant onto real UUIDs.
 */
export async function GET() {
  if (_cache && _cache.expiresAt > Date.now()) {
    return new NextResponse(_cache.body, {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }
  const supabase = getSupabase();
  const { data } = await supabase
    .from("feeds")
    .select("id, name, slug")
    .eq("user_id", SYSTEM_USER)
    .eq("is_active", true);

  const body = JSON.stringify({ feeds: data || [] });
  _cache = { body, expiresAt: Date.now() + TTL_MS };
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
  });
}
