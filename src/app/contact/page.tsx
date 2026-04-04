import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Github } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — MyFeed",
  description: "Get in touch with the MyFeed team.",
};

export default function ContactPage() {
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

        <div className="space-y-4">
          <a href="mailto:hello@myfeed.space" className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-bg-card hover:border-text/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-text/5 flex items-center justify-center">
              <Mail className="h-5 w-5 text-text" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">Email</div>
              <div className="text-xs text-text-muted">hello@myfeed.space</div>
            </div>
          </a>

          <a href="https://github.com/fainir/feedbot/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-bg-card hover:border-text/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-text/5 flex items-center justify-center">
              <Github className="h-5 w-5 text-text" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">GitHub Issues</div>
              <div className="text-xs text-text-muted">Report bugs or request features</div>
            </div>
          </a>

          <a href="https://twitter.com/myfeedspace" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-bg-card hover:border-text/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-text/5 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-text" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">Twitter / X</div>
              <div className="text-xs text-text-muted">@myfeedspace</div>
            </div>
          </a>
        </div>

        <div className="mt-12 p-6 rounded-2xl border border-border bg-bg-card">
          <h2 className="text-base font-semibold text-text mb-2">For publishers</h2>
          <p className="text-sm text-text-muted">If you&apos;re a content publisher and want to add or remove your RSS feed from MyFeed, email us at <a href="mailto:hello@myfeed.space" className="text-text underline">hello@myfeed.space</a> with your site URL.</p>
        </div>
      </main>
    </div>
  );
}
