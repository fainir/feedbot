import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split("@")[0] },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from("profiles").upsert({
      id: user.user.id,
      email,
      name: name || email.split("@")[0],
      plan: "free",
    });

    return NextResponse.json({ success: true, user_id: user.user.id });
  } catch {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
