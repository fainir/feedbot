import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getAuthClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - get current user's email preferences
export async function GET() {
  const supabase = getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = getServiceClient();
  const { data } = await service
    .from("email_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data || {
    digest_enabled: false,
    digest_frequency: "daily",
    feed_ids: null,
  });
}

// POST - update email preferences
// { digest_enabled, digest_frequency, feed_ids }
export async function POST(req: NextRequest) {
  const supabase = getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { digest_enabled, digest_frequency, feed_ids } = body;

  const service = getServiceClient();
  const { data, error } = await service
    .from("email_preferences")
    .upsert({
      user_id: user.id,
      digest_enabled: digest_enabled ?? false,
      digest_frequency: digest_frequency || "daily",
      feed_ids: feed_ids || null,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
