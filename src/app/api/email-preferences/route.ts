import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  const { data } = await svc
    .from("email_preferences")
    .select("digest_enabled, digest_frequency, feed_ids")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    enabled: data?.digest_enabled ?? false,
    frequency: data?.digest_frequency ?? "daily",
    feeds: data?.feed_ids ?? ["for-you"],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Accept both frontend format (enabled/frequency/feeds) and raw DB format
  const enabled = body.enabled ?? body.digest_enabled ?? true;
  const frequency = body.frequency || body.digest_frequency || "daily";
  const feedIds = body.feeds || body.feed_ids || ["for-you"];

  const svc = getServiceClient();
  const { error } = await svc
    .from("email_preferences")
    .upsert({
      user_id: user.id,
      digest_enabled: enabled,
      digest_frequency: frequency,
      feed_ids: feedIds,
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "Failed to save", detail: error.message, code: error.code }, { status: 500 });
  return NextResponse.json({ success: true });
}
