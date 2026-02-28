import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("x-user-id");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();

  const { data: feed, error: feedError } = await supabase
    .from("feeds")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (feedError || !feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const { data: items, error: itemsError } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_id", id)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ feed, items });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 });
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
    const validSchedules = ["daily", "hourly", "realtime"];
    if (!validSchedules.includes(updates.schedule as string)) {
      return NextResponse.json(
        { error: "schedule must be daily, hourly, or realtime" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("feeds")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feed });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("feeds")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  await supabase.from("feed_items").delete().eq("feed_id", id);
  await supabase.from("notifications").delete().eq("feed_id", id);

  const { error } = await supabase.from("feeds").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
