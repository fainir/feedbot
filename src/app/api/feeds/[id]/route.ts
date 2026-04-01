import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { getAllowedSchedules } from "@/lib/usage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: feed, error: feedError } = await supabase
    .from("feeds")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (feedError || !feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  const { data: items, error: itemsError } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_id", id)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (itemsError) {
    // DB query failed — error details captured by Vercel runtime
    return NextResponse.json({ error: "Failed to load feed items" }, { status: 500 });
  }

  return NextResponse.json({ feed, items });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = [
    "name",
    "description",
    "query_text",
    "schedule",
    "notify_email",
    "notify_push",
    "notify_whatsapp",
    "is_active",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (updates.schedule) {
    // Enforce plan-based schedule limits
    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    const userPlan = (profile?.plan as string) || "free";
    const allowed = getAllowedSchedules(userPlan);
    if (!allowed.includes(updates.schedule as "daily" | "hourly" | "realtime")) {
      return NextResponse.json(
        { error: `Schedule "${updates.schedule}" requires Pro plan` },
        { status: 403 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("feeds")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const { data: feed, error } = await supabase
    .from("feeds")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Update failed — error details captured by Vercel runtime
    return NextResponse.json({ error: "Failed to update feed" }, { status: 500 });
  }

  return NextResponse.json({ feed });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabase
    .from("feeds")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  // Use service client for deleting feed_items (no INSERT/DELETE RLS policy)
  const service = getServiceClient();
  await service.from("feed_items").delete().eq("feed_id", id);
  await service.from("notifications").delete().eq("feed_id", id);

  const { error } = await supabase.from("feeds").delete().eq("id", id);

  if (error) {
    // Delete failed — error details captured by Vercel runtime
    return NextResponse.json({ error: "Failed to delete feed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
