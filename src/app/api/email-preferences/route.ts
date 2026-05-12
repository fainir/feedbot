import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Frequency = "daily" | "weekly" | "never";
type FeedFrequencies = Record<string, { frequency: Frequency; last_sent_at?: string | null }>;

function isFrequency(s: unknown): s is Frequency {
  return s === "daily" || s === "weekly" || s === "never";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  // Try selecting the new column. If migration 013 hasn't been applied to
  // this Supabase yet, the schema cache complains — retry without it.
  let data: {
    digest_enabled?: boolean;
    digest_frequency?: string;
    feed_ids?: string[] | null;
    feed_frequencies?: FeedFrequencies | null;
  } | null = null;
  const tryFull = await svc
    .from("email_preferences")
    .select("digest_enabled, digest_frequency, feed_ids, feed_frequencies")
    .eq("user_id", user.id)
    .single();
  if (tryFull.error && tryFull.error.code === "42703") {
    const tryLegacy = await svc
      .from("email_preferences")
      .select("digest_enabled, digest_frequency, feed_ids")
      .eq("user_id", user.id)
      .single();
    data = tryLegacy.data;
  } else {
    data = tryFull.data;
  }

  // Build legacy `feeds` list for callers that still expect it.
  const ff = (data?.feed_frequencies as FeedFrequencies | null) || {};
  const feedsFromMap = Object.entries(ff)
    .filter(([, cfg]) => cfg && cfg.frequency !== "never")
    .map(([id]) => id);
  const feeds = feedsFromMap.length > 0 ? feedsFromMap : (data?.feed_ids ?? ["for-you"]);

  return NextResponse.json({
    enabled: data?.digest_enabled ?? false,
    frequency: data?.digest_frequency ?? "daily",
    feeds,
    feedFrequencies: ff,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const enabled = body.enabled ?? body.digest_enabled ?? true;
  const frequency = body.frequency || body.digest_frequency || "daily";

  // New shape: feedFrequencies as { uuid: "daily"|"weekly"|"never" }. Filter out
  // non-UUID keys (the legacy "for-you" slug that doesn't map to a feed row).
  const rawFreqs = (body.feedFrequencies || body.feed_frequencies || null) as
    | Record<string, Frequency>
    | null;
  let feedFrequencies: FeedFrequencies | null = null;
  if (rawFreqs && typeof rawFreqs === "object") {
    const out: FeedFrequencies = {};
    for (const [id, f] of Object.entries(rawFreqs)) {
      if (!UUID_RE.test(id)) continue;
      if (!isFrequency(f)) continue;
      out[id] = { frequency: f, last_sent_at: null };
    }
    feedFrequencies = out;
  }

  // Backward-compat: caller still using `feeds: string[]`. Convert into a
  // feed_frequencies map at the global `frequency`.
  if (!feedFrequencies) {
    const rawFeeds = body.feeds || body.feed_ids || null;
    if (Array.isArray(rawFeeds)) {
      const out: FeedFrequencies = {};
      for (const id of rawFeeds) {
        if (typeof id === "string" && UUID_RE.test(id)) {
          out[id] = { frequency: isFrequency(frequency) ? frequency : "daily", last_sent_at: null };
        }
      }
      feedFrequencies = out;
    }
  }

  // Preserve last_sent_at on existing feeds so updating prefs doesn't reset
  // the cron's per-feed schedule.
  const svc = getServiceClient();
  if (feedFrequencies && Object.keys(feedFrequencies).length > 0) {
    const { data: existing } = await svc
      .from("email_preferences")
      .select("feed_frequencies")
      .eq("user_id", user.id)
      .single();
    const prev = (existing?.feed_frequencies as FeedFrequencies | null) || {};
    for (const id of Object.keys(feedFrequencies)) {
      if (prev[id]?.last_sent_at) {
        feedFrequencies[id].last_sent_at = prev[id].last_sent_at;
      }
    }
  }

  // Derive the legacy `feed_ids` from the new map so old code paths keep
  // working until we drop them.
  const feedIds = feedFrequencies
    ? Object.entries(feedFrequencies).filter(([, c]) => c.frequency !== "never").map(([id]) => id)
    : null;

  // Try the new schema first (feed_frequencies column from migration 013).
  // If the column doesn't exist yet (migration not run in this environment),
  // fall back to the legacy shape so saving still works for users.
  const fullRow = {
    user_id: user.id,
    digest_enabled: enabled,
    digest_frequency: frequency,
    feed_ids: feedIds && feedIds.length > 0 ? feedIds : null,
    feed_frequencies: feedFrequencies ?? {},
  };
  const { error: errFull } = await svc
    .from("email_preferences")
    .upsert(fullRow, { onConflict: "user_id" });

  if (errFull && errFull.code === "PGRST204") {
    // Schema cache says the column isn't there — retry without it.
    const { feed_frequencies: _drop, ...legacyRow } = fullRow;
    const { error: errLegacy } = await svc
      .from("email_preferences")
      .upsert(legacyRow, { onConflict: "user_id" });
    if (errLegacy) {
      return NextResponse.json({ error: "Failed to save", detail: errLegacy.message, code: errLegacy.code }, { status: 500 });
    }
    return NextResponse.json({ success: true, schema: "legacy" });
  }
  if (errFull) {
    return NextResponse.json({ error: "Failed to save", detail: errFull.message, code: errFull.code }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
