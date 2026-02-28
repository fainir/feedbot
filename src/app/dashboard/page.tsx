"use client";

import { useState } from "react";
import { Plus, Rss, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { CreateFeedModal } from "@/components/feed/create-feed-modal";

const MOCK_ITEMS = [
  {
    id: "1",
    title: "GPT-5 Technical Report: Reasoning, Multimodality, and Safety",
    summary:
      "OpenAI released the full technical report for GPT-5, detailing advances in chain-of-thought reasoning, native multimodal understanding, and a new alignment framework that significantly reduces hallucination rates.",
    source: "OpenAI Blog",
    url: "https://openai.com/blog",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "State Space Models vs Transformers: A Practical Benchmark",
    summary:
      "A comprehensive benchmark comparing Mamba-2, RWKV-7, and Transformer++ across 15 NLP tasks. SSMs show 3x inference speedup at comparable quality for sequences under 8K tokens.",
    source: "arXiv",
    url: "https://arxiv.org",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Claude's Constitutional AI: Year Two Retrospective",
    summary:
      "Anthropic shares lessons learned from two years of Constitutional AI research, including new techniques for scalable oversight and improved harmlessness without sacrificing helpfulness.",
    source: "Anthropic Research",
    url: "https://anthropic.com",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    title: "The Rise of AI-Native Developer Tools in 2026",
    summary:
      "A deep dive into how AI-native IDEs and coding assistants are reshaping developer workflows, with data from 10,000 professional developers on productivity gains and adoption patterns.",
    source: "The Pragmatic Engineer",
    url: "https://blog.pragmaticengineer.com",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    title: "Y Combinator W26 Batch: AI Startups to Watch",
    summary:
      "An overview of the most promising AI companies from YC's Winter 2026 batch, spanning developer tools, healthcare, education, and autonomous agents.",
    source: "TechCrunch",
    url: "https://techcrunch.com",
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    title: "Next.js 16: What You Need to Know About the New Compiler",
    summary:
      "The new Rust-based compiler in Next.js 16 delivers 5x faster builds and native RSC streaming. Here are the migration steps and gotchas from upgrading a large production app.",
    source: "Vercel Blog",
    url: "https://vercel.com/blog",
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmpty] = useState(false);

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Your Feed</h1>
            <p className="mt-1 text-sm text-text-muted">
              {MOCK_ITEMS.length} items from all feeds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-text-muted"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-text-muted"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              New Feed
            </Button>
          </div>
        </div>

        {showEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Rss className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-text">
              Create your first feed
            </h2>
            <p className="mb-6 max-w-sm text-center text-sm text-text-muted">
              Describe what you want to follow in plain English. FeedBot will
              scan the internet and deliver matching content to you.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Create Feed
            </Button>
          </div>
        ) : (
          /* Feed items */
          <div className="space-y-3">
            {MOCK_ITEMS.map((item) => (
              <FeedCard
                key={item.id}
                title={item.title}
                summary={item.summary}
                source={item.source}
                url={item.url}
                publishedAt={item.publishedAt}
              />
            ))}
          </div>
        )}
      </div>

      <CreateFeedModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
