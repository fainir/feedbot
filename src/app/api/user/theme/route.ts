import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Theme = "dark" | "light";

function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "light";
}

// Postgres error code for "column does not exist". If the migration hasn't
// landed yet on this environment, we degrade gracefully (default dark, no
// persistence) instead of returning a 500 and breaking the toggle UX.
const MISSING_COLUMN = "42703";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("theme")
    .eq("id", user.id)
    .maybeSingle();

  if (error && error.code !== MISSING_COLUMN) {
    return NextResponse.json({ error: "Failed to read theme" }, { status: 500 });
  }
  return NextResponse.json({ theme: (data?.theme as Theme) || "dark" });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const theme = (body as { theme?: unknown })?.theme;
  if (!isTheme(theme)) return NextResponse.json({ error: "Invalid theme" }, { status: 400 });

  const { error } = await supabase
    .from("profiles")
    .update({ theme })
    .eq("id", user.id);

  if (error) {
    // Migration not applied yet — accept the value but tell the client we
    // couldn't persist. Client-side localStorage still has the latest value.
    if (error.code === MISSING_COLUMN) {
      return NextResponse.json({ ok: false, theme, persisted: false });
    }
    return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, theme, persisted: true });
}
