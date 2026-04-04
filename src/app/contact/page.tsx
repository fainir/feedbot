"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Github, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !message) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border h-11 flex items-center px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
          <span className="text-sm font-semibold">MyFeed</span>
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Contact us</h1>
        <p className="text-sm text-text-muted mb-8">Have feedback, a bug report, or a question? We&apos;d love to hear from you.</p>

        {status === "sent" ? (
          <div className="flex items-center gap-3 p-6 rounded-2xl border border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text">Message sent!</p>
              <p className="text-xs text-text-muted mt-0.5">We&apos;ll get back to you as soon as possible.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-text-muted mb-1">Name (optional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-text/50 transition-all placeholder:text-text-muted/50"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-muted mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
                className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-text/50 transition-all placeholder:text-text-muted/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-xs font-medium text-text-muted mb-1">Message</label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                rows={5}
                className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-text/50 transition-all placeholder:text-text-muted/50"
                placeholder="What's on your mind?"
              />
            </div>
            {status === "error" && (
              <p className="text-xs text-red-400">Something went wrong. Please try again or email us directly.</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-2.5 text-sm font-semibold bg-text text-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : "Send message"}
            </button>
          </form>
        )}

        <div className="mt-10 space-y-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Or reach us directly</p>
          <a href="mailto:hello@myfeed.space" className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-card hover:border-text/20 transition-all">
            <Mail className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-muted">hello@myfeed.space</span>
          </a>
          <a href="https://github.com/fainir/feedbot/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-card hover:border-text/20 transition-all">
            <Github className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-muted">GitHub Issues</span>
          </a>
        </div>

        <div className="mt-10 p-4 rounded-xl border border-border bg-bg-card">
          <p className="text-xs font-medium text-text mb-1">For publishers</p>
          <p className="text-xs text-text-muted">Want to add or remove your RSS feed? Email <a href="mailto:hello@myfeed.space" className="text-text underline">hello@myfeed.space</a> with your site URL.</p>
        </div>
      </main>
    </div>
  );
}
