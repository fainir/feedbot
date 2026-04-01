import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Rate limit: 5 waitlist signups per minute per IP
  const rl = rateLimit(`waitlist:${getClientKey(req)}`, { limit: 5, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Try to save to Supabase if configured
    try {
      const supabase = getServiceClient();
      await supabase.from("waitlist").upsert(
        { email: email.toLowerCase().trim(), created_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    } catch {
      // Supabase not configured yet — just accept the submission
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}
