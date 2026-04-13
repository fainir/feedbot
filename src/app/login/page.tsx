"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { trackEvent, identifyUser } from "@/components/analytics";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error") === "auth" ? "Authentication failed. Please check your login details." : searchParams.get("error_description") || searchParams.get("error") || null);
  const [message, setMessage] = useState<string | null>(null);
  const pendingPrompt = searchParams.get("prompt");
  const wantsEmail = searchParams.get("email") === "true";

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }
      trackEvent("signup", { method: "email", has_prompt: !!pendingPrompt });
      // Auto-login
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) {
        setMessage("Account created! You can now log in.");
        setLoading(false);
        return;
      }
      // If there's a pending prompt, create the feed and redirect to it
      if (pendingPrompt) {
        try {
          const feedRes = await fetch("/api/feeds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pendingPrompt.slice(0, 40),
              query_text: pendingPrompt,
            }),
          });
          if (feedRes.ok) {
            const feedData = await feedRes.json();
            const newFeedId = feedData.feed?.id;
            if (newFeedId) {
              // Trigger immediate refresh for this feed
              fetch(`/api/feeds/${newFeedId}/refresh`, { method: "POST" }).catch(() => {});
              window.location.href = `/my/${newFeedId}`;
              return;
            }
          }
        } catch { /* feed creation failed, still redirect */ }
      }
      // Auto-enable email updates if they signed up from email CTA
      if (wantsEmail) {
        try {
          await fetch("/api/email-preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: true, frequency: "daily", time: "08:00", feeds: ["for-you"] }),
          });
        } catch {}
      }
      window.location.href = "/dashboard";
    } else {
      trackEvent("login", { method: "email" });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    }
  }

  async function handleGoogleLogin() {
    trackEvent("login_attempt", { method: "google", has_prompt: !!pendingPrompt });
    const params = new URLSearchParams();
    if (pendingPrompt) params.set("prompt", pendingPrompt);
    if (wantsEmail) params.set("email", "true");
    const qs = params.toString();
    const redirectUrl = `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Left side — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-bg-card border-r border-border p-12">
        <div className="max-w-md">
          <Link href="/ai" className="flex items-center gap-2 mb-8">
            <span className="flex items-center justify-center w-10 h-10 bg-text text-bg rounded-xl text-sm font-extrabold tracking-tighter">MF</span>
            <span className="text-2xl font-bold">MyFeed</span>
          </Link>
          <h2 className="text-3xl font-bold mb-4 leading-tight">Your internet,<br />curated by AI</h2>
          <p className="text-text-muted text-lg mb-8">Describe what you care about in plain English. We scan thousands of sources and deliver only what matters.</p>
          {pendingPrompt && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-text" />
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Your feed prompt</span>
              </div>
              <p className="text-sm text-text">{pendingPrompt}</p>
            </div>
          )}
          {!pendingPrompt && (
            <div className="space-y-3">
              {["AI tools & products", "Startup funding rounds", "React & Next.js tutorials", "Space exploration news"].map((ex) => (
                <div key={ex} className="flex items-center gap-2 text-sm text-text-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-text/30" />
                  {ex}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/ai" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <span className="flex items-center justify-center w-8 h-8 bg-text text-bg rounded-lg text-xs font-extrabold tracking-tighter">MF</span>
            <span className="text-xl font-bold">MyFeed</span>
          </Link>

          <h1 className="mb-2 text-center text-2xl font-bold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mb-8 text-center text-sm text-text-muted">
            {isSignUp
              ? pendingPrompt ? "Sign up to create your custom feed" : "Start curating your personalized feeds"
              : "Log in to your personalized feeds"}
          </p>

          {pendingPrompt && (
            <div className="mb-6 rounded-xl border border-border bg-bg-card p-3 lg:hidden">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-text-muted" />
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">Your feed</span>
              </div>
              <p className="text-xs text-text line-clamp-2">{pendingPrompt}</p>
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-card py-2.5 text-sm font-medium text-text transition-all hover:bg-bg-hover"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-label="Email"
              className="w-full rounded-xl border border-border bg-bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-text/50 focus:outline-none focus:ring-1 focus:ring-text/20 transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              aria-label="Password"
              className="w-full rounded-xl border border-border bg-bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-text/50 focus:outline-none focus:ring-1 focus:ring-text/20 transition-all"
            />

            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{error}</p>
            )}
            {message && (
              <p role="status" className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-400">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-text text-bg py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Log In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
              className="font-medium text-text hover:underline"
            >
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </p>

          <Link href="/ai" className="block mt-4 text-center text-xs text-text-muted hover:text-text transition-colors">
            ← Back to feeds
          </Link>
        </div>
      </div>
    </div>
  );
}
