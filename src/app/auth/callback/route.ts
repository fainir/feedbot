import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const prompt = searchParams.get("prompt");

  // Prevent open redirect: only allow relative paths starting with /
  // Block protocol-relative URLs (//evil.com), absolute URLs, and data: URIs
  const next = (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://"))
    ? rawNext
    : "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = new URL(`${origin}${next}`);
      if (prompt) {
        redirectUrl.searchParams.set("prompt", prompt);
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  const errorDesc = searchParams.get("error_description");
  const loginUrl = new URL(`${origin}/login`);
  loginUrl.searchParams.set("error", "auth");
  if (errorDesc) {
    loginUrl.searchParams.set("error_description", errorDesc);
  }
  return NextResponse.redirect(loginUrl);
}
