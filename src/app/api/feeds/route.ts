import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { discoverFeeds } from "@/lib/feed-engine";
import { classifyAndInsert } from "@/lib/classify";
import { fillFeeds } from "@/lib/feed-fill";
import { canCreateFeed, getAllowedSchedules } from "@/lib/usage";
import { generateSearchPlan } from "@/lib/prompt-intelligence";
import { normalizeFeedText } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: feeds, error } = await supabase
    .from("feeds")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Query failed — error details captured by Vercel runtime
    return NextResponse.json({ error: "Failed to load feeds" }, { status: 500 });
  }

  return NextResponse.json({ feeds });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Enforce plan limits
  const allowed = await canCreateFeed(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Feed limit reached. Upgrade to Pro for unlimited feeds." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name: nameRaw, query_text: queryRaw, description, schedule, notify_email, notify_push, notify_whatsapp, is_public } =
    body as {
      name?: string;
      query_text?: string;
      description?: string;
      schedule?: string;
      notify_email?: boolean;
      notify_push?: boolean;
      notify_whatsapp?: boolean;
      is_public?: boolean;
    };

  // Trim + collapse whitespace so a trailing space or pasted newline can't
  // create a near-duplicate feed / junk slug. Empty-after-trim is rejected below.
  const name = normalizeFeedText(nameRaw);
  const query_text = normalizeFeedText(queryRaw);

  if (!name || !query_text) {
    return NextResponse.json(
      { error: "name and query_text are required" },
      { status: 400 }
    );
  }

  if (name.length > 100 || query_text.length > 500) {
    return NextResponse.json(
      { error: "name must be under 100 chars, query under 500 chars" },
      { status: 400 }
    );
  }

  // Get user plan and enforce schedule limits
  const serviceClient = getServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const userPlan = (profile?.plan as string) || "free";
  const allowedSchedules = getAllowedSchedules(userPlan);
  const feedSchedule = allowedSchedules.includes(schedule as "daily" | "hourly" | "realtime")
    ? schedule
    : allowedSchedules[0];

  // Generate URL-safe slug from name
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 50);
  let feedSlug = baseSlug;
  // Check for conflicts with existing slugs
  const { data: existingSlug } = await serviceClient
    .from("feeds")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();
  if (existingSlug) {
    feedSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }

  // Generate search plan upfront so the cron job can use it immediately
  let searchPlan = null;
  try {
    searchPlan = await generateSearchPlan(query_text);
  } catch {
    // Search plan generation failed — feed will still work, cron generates it lazily
  }

  const { data: feed, error } = await supabase
    .from("feeds")
    .insert({
      user_id: user.id,
      name,
      description: description || query_text,
      query_text,
      schedule: feedSchedule,
      notify_email: notify_email ?? true,
      notify_push: notify_push ?? false,
      notify_whatsapp: notify_whatsapp ?? false,
      is_active: true,
      is_public: is_public ?? false,
      slug: feedSlug,
      last_refreshed_at: null,
      ...(searchPlan ? { search_plan: searchPlan } : {}),
    })
    .select()
    .single();

  if (error) {
    // Insert failed — error details captured by Vercel runtime
    return NextResponse.json({ error: "Failed to create feed" }, { status: 500 });
  }

  // Fire-and-forget: populate feed in background so the response returns instantly
  const svc = getServiceClient();
  const feedId = feed.id;
  const newFeed = { id: feedId, name: feed.name as string, query_text: query_text };
  Promise.resolve().then(async () => {
    try {
      // Instant semantic pull from the pool — only on paid compute
      // (EVO_SEMANTIC=1); the embed/vector path is too IO-heavy for
      // free-tier Supabase. See instrumentation.ts.
      if (process.env.EVO_SEMANTIC === "1") {
        await fillFeeds(svc, { feedIds: [feedId] });
      }
      // Brave-discover targeted results for the exact prompt + classify in.
      // This is the free-tier population path for a new feed; the cron then
      // keeps it fresh via classify.
      const discovered = await discoverFeeds(query_text);
      if (discovered.length > 0) {
        await classifyAndInsert(discovered, [newFeed], svc);
      }
      await svc.from("feeds").update({ last_refreshed_at: new Date().toISOString() }).eq("id", feedId);
    } catch {}
  });

  return NextResponse.json(
    { feed, populating: true },
    { status: 201 }
  );
}
