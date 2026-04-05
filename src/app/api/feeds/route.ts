import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { discoverFeeds } from "@/lib/feed-engine";
import { canCreateFeed, getAllowedSchedules } from "@/lib/usage";
import { generateSearchPlan } from "@/lib/prompt-intelligence";

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

  const { name, query_text, description, schedule, notify_email, notify_push, notify_whatsapp, is_public } =
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
      last_refreshed_at: null,
      ...(searchPlan ? { search_plan: searchPlan } : {}),
    })
    .select()
    .single();

  if (error) {
    // Insert failed — error details captured by Vercel runtime
    return NextResponse.json({ error: "Failed to create feed" }, { status: 500 });
  }

  let initialItems: Awaited<ReturnType<typeof discoverFeeds>> = [];
  try {
    initialItems = await discoverFeeds(query_text);

    if (initialItems.length > 0) {
      const rows = initialItems.map((item) => ({
        feed_id: feed.id,
        title: item.title,
        url: item.url,
        summary: item.summary,
        source: item.source,
        image_url: item.image_url,
        published_at: item.published_at,
      }));

      await getServiceClient().from("feed_items").insert(rows);

      await supabase
        .from("feeds")
        .update({ last_refreshed_at: new Date().toISOString() })
        .eq("id", feed.id);
    }
  } catch {
    // Initial feed discovery failed — feed still created successfully
  }

  return NextResponse.json(
    { feed, initial_items_count: initialItems.length },
    { status: 201 }
  );
}
