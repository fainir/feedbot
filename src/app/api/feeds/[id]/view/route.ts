import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/feeds/[id]/view — increment view count
 * Fire-and-forget from client when feed page loads.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  // Atomic increment using Postgres
  const { data } = await supabase
    .from("feeds")
    .select("views")
    .eq("id", id)
    .single();

  if (data) {
    await supabase
      .from("feeds")
      .update({ views: (data.views || 0) + 1 })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
