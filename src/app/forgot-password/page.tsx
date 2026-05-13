"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

// Password reset flow. Supabase emails a magic link that lands on
// /auth/callback?type=recovery; we don't need a custom recovery page yet
// because Supabase handles the token exchange and redirects back to /. Once
// we want an in-app "set new password" screen we add /auth/reset-password
// and pass redirectTo here.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (err) throw err;
      // Always show "sent" — never disclose whether the email is registered.
      // That's a privacy guarantee, not a Supabase API limitation.
      setSent(true);
    } catch (err) {
      // Same reason: if Supabase rate-limited or threw a network error, surface
      // a generic friendly message rather than leaking enumeration info.
      setSent(true);
      console.warn("[forgot-password]", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 bg-text text-bg rounded-lg text-xs font-extrabold tracking-tighter">MF</span>
            <span className="text-xl font-bold">MyFeed</span>
          </Link>

          <h1 className="mb-2 text-center text-2xl font-bold">Reset your password</h1>
          <p className="mb-8 text-center text-sm text-text-muted">
            {sent
              ? "If an account exists for that email, we just sent a password reset link."
              : "Enter your email and we'll send you a link to reset your password."}
          </p>

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-medium text-text-muted">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-border bg-bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-text/50 focus:outline-none focus:ring-1 focus:ring-text/20 transition-all"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                aria-disabled={loading || !email}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-text text-bg py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    Send reset link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <Link href="/login" className="mt-6 flex items-center justify-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
