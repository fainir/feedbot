import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "fainir2006@gmail.com";

async function safeCount(p: PromiseLike<{ count: number | null }>): Promise<number> {
  try {
    const r = await p;
    return r.count ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const svc = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [feedsTotal, feedsWeek, emailPrefs, articlesWeek, articles24h, topFeedsRes] = await Promise.all([
    safeCount(svc.from("feeds").select("id", { count: "exact", head: true })),
    safeCount(svc.from("feeds").select("id", { count: "exact", head: true }).gte("created_at", weekAgoIso)),
    safeCount(svc.from("email_preferences").select("user_id", { count: "exact", head: true }).eq("enabled", true)),
    safeCount(svc.from("article_pool").select("id", { count: "exact", head: true }).gte("created_at", weekAgoIso)),
    safeCount(svc.from("article_pool").select("id", { count: "exact", head: true }).gte("created_at", dayAgoIso)),
    svc.from("feeds").select("id, name, query_text, user_id").order("created_at", { ascending: false }).limit(10),
  ]);

  // Users: admin API
  let totalUsers = 0;
  let usersLast24h = 0;
  let usersLast7d = 0;
  try {
    const { data: adminList } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = adminList?.users ?? [];
    totalUsers = users.length;
    usersLast24h = users.filter((u) => u.created_at && new Date(u.created_at) >= new Date(dayAgoIso)).length;
    usersLast7d = users.filter((u) => u.created_at && new Date(u.created_at) >= new Date(weekAgoIso)).length;
  } catch {}

  return NextResponse.json({
    users: { total: totalUsers, last24h: usersLast24h, last7d: usersLast7d },
    feeds: { total: feedsTotal, last7d: feedsWeek },
    email_optins: emailPrefs,
    articles: { total_7d: articlesWeek, last24h: articles24h },
    recent_feeds: topFeedsRes.data ?? [],
    as_of: now.toISOString(),
  });
}
