"use client";

import { useState, useMemo } from "react";
import { Share2, Link2, Check, X, Twitter, Linkedin, Mail, Copy, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface ShareFeedProps {
  feedName: string;
  feedPrompt: string;
  items: FeedItem[];
}

function generateGridPattern(seed: string): boolean[][] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const size = 9;
  const grid: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
        grid[row][col] = true;
      } else {
        const mirrorCol = col <= Math.floor(size / 2) ? col : size - 1 - col;
        hash = ((hash << 5) - hash + (row * size + mirrorCol) * 17) | 0;
        grid[row][col] = Math.abs(hash) % 3 !== 0;
      }
    }
  }
  // Mirror horizontally for symmetry
  for (let row = 0; row < size; row++) {
    for (let col = Math.ceil(size / 2); col < size; col++) {
      grid[row][col] = grid[row][size - 1 - col];
    }
  }
  return grid;
}

function QRPattern({ seed }: { seed: string }) {
  const grid = useMemo(() => generateGridPattern(seed), [seed]);
  const size = grid.length;
  const cellSize = 6;
  const totalSize = size * cellSize;

  return (
    <svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      className="rounded-lg"
    >
      <rect width={totalSize} height={totalSize} rx="4" className="fill-white" />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              rx="1"
              className="fill-gray-900"
            />
          ) : null
        )
      )}
      {/* Corner markers */}
      {[[0, 0], [0, totalSize - 14], [totalSize - 14, 0]].map(([y, x], i) => (
        <g key={`corner-${i}`}>
          <rect x={x} y={y} width={14} height={14} rx="2" className="fill-gray-900" />
          <rect x={x + 2} y={y + 2} width={10} height={10} rx="1" className="fill-white" />
          <rect x={x + 4} y={y + 4} width={6} height={6} rx="1" className="fill-gray-900" />
        </g>
      ))}
    </svg>
  );
}

export function ShareFeed({ feedName, feedPrompt, items }: ShareFeedProps) {
  const [open, setOpen] = useState(false);
  const [includeItems, setIncludeItems] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = useMemo(() => {
    const data: Record<string, unknown> = {
      name: feedName,
      prompt: feedPrompt,
    };
    if (includeItems && items.length > 0) {
      data.items = items.slice(0, 20).map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sourceIcon: item.sourceIcon,
      }));
    }
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    if (typeof window !== "undefined") {
      return `${window.location.origin}/shared/feed#${encoded}`;
    }
    return `/shared/feed#${encoded}`;
  }, [feedName, feedPrompt, items, includeItems]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const encodedTitle = encodeURIComponent(`Check out my "${feedName}" feed on FeedBot!`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const socialLinks = [
    {
      name: "Twitter / X",
      icon: <Twitter className="h-4 w-4" />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: "hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/30",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
    },
    {
      name: "Email",
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encodedTitle}&body=I%20found%20this%20great%20feed%20on%20FeedBot:%0A%0A${encodedUrl}`,
      color: "hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30",
    },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        title="Share this feed"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text">Share Feed</h3>
                <p className="mt-0.5 text-sm text-text-muted">
                  Share &ldquo;{feedName}&rdquo; with others
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QR Code */}
            <div className="mb-5 flex justify-center">
              <div className="rounded-xl bg-white p-3 shadow-inner">
                <QRPattern seed={feedName + feedPrompt} />
              </div>
            </div>

            {/* Include items toggle */}
            <button
              onClick={() => setIncludeItems((v) => !v)}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:bg-bg-hover"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-text">Include current items</p>
                <p className="text-xs text-text-muted">
                  {includeItems
                    ? `Share config + ${Math.min(items.length, 20)} items`
                    : "Share feed config only"}
                </p>
              </div>
              {includeItems ? (
                <ToggleRight className="h-6 w-6 text-primary" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-text-muted" />
              )}
            </button>

            {/* Share link with copy */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5">
              <Link2 className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="flex-1 truncate text-sm text-text-muted">
                {shareUrl}
              </span>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </span>
                )}
              </button>
            </div>

            {/* Social sharing */}
            <div>
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                Share to
              </p>
              <div className="flex gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-text-muted transition-all ${link.color}`}
                  >
                    {link.icon}
                    <span className="text-xs font-medium">{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
