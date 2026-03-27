"use client";

import { useState } from "react";
import { Share2, Twitter, Linkedin, Link as LinkIcon, Check, Mail, MessageCircle } from "lucide-react";

interface QuickShareProps {
  title: string;
  url: string;
  summary?: string;
}

export function QuickShareMenu({ title, url, summary }: QuickShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);
  const encodedSummary = encodeURIComponent(summary?.slice(0, 100) || "");

  const shareLinks = [
    {
      name: "Twitter / X",
      icon: <Twitter className="h-3.5 w-3.5" />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: "hover:text-sky-400",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-3.5 w-3.5" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:text-blue-500",
    },
    {
      name: "Email",
      icon: <Mail className="h-3.5 w-3.5" />,
      href: `mailto:?subject=${encodedTitle}&body=${encodedSummary}%0A%0A${encodedUrl}`,
      color: "hover:text-orange-400",
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle className="h-3.5 w-3.5" />,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:text-green-400",
    },
  ];

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
        title="Share article"
        aria-label={`Share "${title}"`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute bottom-full right-0 z-20 mb-1 w-44 rounded-xl border border-border bg-bg-card p-1.5 shadow-xl" role="menu" aria-label="Share options">
            <div className="mb-1 px-2 py-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Share to</p>
            </div>
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-text-muted transition-colors hover:bg-bg-hover ${link.color}`}
                role="menuitem"
                aria-label={`Share on ${link.name}`}
              >
                {link.icon}
                {link.name}
              </a>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => {
                copyLink();
                setTimeout(() => setOpen(false), 800);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              role="menuitem"
              aria-label="Copy link to clipboard"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <LinkIcon className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
