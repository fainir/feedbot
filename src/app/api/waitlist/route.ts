import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
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
      console.log(`Waitlist signup: ${email}`);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}
