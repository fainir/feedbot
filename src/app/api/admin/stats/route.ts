import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

// Admin emails allowlist — add admin user emails here
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Admin role check — only allowlisted emails can access admin stats
  if (!user.email || !ADMIN_EMAILS.has(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = getServiceClient();

  // Run all queries in parallel
  const [
    usersResult,
    feedsResult,
    itemsResult,
    planDistribution,
    recentUsers,
    recentFeeds,
    scheduleDistribution,
  ] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }),
    service.from("feeds").select("id", { count: "exact", head: true }),
    service.from("feed_items").select("id", { count: "exact", head: true }),
    service.from("profiles").select("plan"),
    service
      .from("profiles")
      .select("id, email, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    service
      .from("feeds")
      .select("id, name, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    service.from("feeds").select("schedule"),
  ]);

  // Plan distribution
  const plans: Record<string, number> = { free: 0, pro: 0 };
  for (const row of planDistribution.data || []) {
    plans[row.plan] = (plans[row.plan] || 0) + 1;
  }

  // Schedule distribution
  const schedules: Record<string, number> = {};
  for (const row of scheduleDistribution.data || []) {
    schedules[row.schedule] = (schedules[row.schedule] || 0) + 1;
  }

  // Daily signups (last 30 days)
  const dailySignups: Record<string, number> = {};
  for (const row of recentUsers.data || []) {
    const day = row.created_at?.slice(0, 10);
    if (day) dailySignups[day] = (dailySignups[day] || 0) + 1;
  }

  // Daily feed creation (last 30 days)
  const dailyFeeds: Record<string, number> = {};
  for (const row of recentFeeds.data || []) {
    const day = row.created_at?.slice(0, 10);
    if (day) dailyFeeds[day] = (dailyFeeds[day] || 0) + 1;
  }

  return NextResponse.json({
    totals: {
      users: usersResult.count || 0,
      feeds: feedsResult.count || 0,
      articles: itemsResult.count || 0,
    },
    plans,
    schedules,
    dailySignups,
    dailyFeeds,
  }, {
    headers: {
      "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
