"use client";

import { useState, useEffect, type ReactNode } from "react";
import { X, ExternalLink, BookOpen, Loader2, Globe, Bookmark, Share2, Copy, Check, BookOpenText } from "lucide-react";
import DOMPurify from "dompurify";
import { ArticleSummarizer } from "./article-summarizer";

interface ArticleReaderProps {
  url: string;
  title: string;
  summary: string;
  source: string;
  sourceIcon?: string;
  publishedAt: string;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  onClose: () => void;
  onOpenReadingMode?: () => void;
  tagSlot?: ReactNode;
}

interface ArticleContent {
  title: string;
  content: string;
  author?: string;
  siteName?: string;
  excerpt?: string;
  wordCount: number;
}

export function ArticleReader({
  url,
  title,
  summary,
  source,
  sourceIcon,
  publishedAt,
  bookmarked,
  onToggleBookmark,
  onClose,
  onOpenReadingMode,
  tagSlot,
}: ArticleReaderProps) {
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSummarizer, setShowSummarizer] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/feed/reader", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setArticle(data);
      } catch {
        setError(true);
      }
      setLoading(false);
    }
    fetchArticle();
  }, [url]);

  // Track scroll progress
  useEffect(() => {
    const container = document.getElementById("article-reader-content");
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = scrollHeight > clientHeight
        ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        : 100;
      setScrollProgress(progress);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [article]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const readingTime = article
    ? `${Math.max(1, Math.ceil(article.wordCount / 200))} min read`
    : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fontSizeClass = fontSize === "sm" ? "text-sm leading-relaxed" : fontSize === "lg" ? "text-lg leading-loose" : "text-base leading-relaxed";

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-sm">
      {/* Overlay click to close */}
      <div className="hidden w-16 shrink-0 lg:block" onClick={onClose} />

      {/* Reader panel */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-bg sm:mx-auto sm:my-4 sm:max-w-3xl sm:rounded-2xl">
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-bg-hover">
          <div
            className="h-0.5 bg-primary transition-all"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {sourceIcon ? (
              <img src={sourceIcon} alt={source} className="h-5 w-5 rounded-sm" />
            ) : (
              <Globe className="h-4 w-4 text-text-muted" />
            )}
            <span className="text-sm font-medium text-text-muted">{source}</span>
            {readingTime && (
              <>
                <span className="text-border">|</span>
                <span className="text-xs text-text-muted">{readingTime}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Font size */}
            <div className="mr-2 flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              {(["sm", "base", "lg"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    fontSize === size ? "bg-primary text-white" : "text-text-muted hover:text-text"
                  }`}
                >
                  {size === "sm" ? "A" : size === "lg" ? "A+" : "A"}
                </button>
              ))}
            </div>
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`rounded-lg p-2 transition-colors ${bookmarked ? "text-secondary" : "text-text-muted hover:text-text"}`}
              >
                <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-secondary" : ""}`} />
              </button>
            )}
            {tagSlot}
            <button
              onClick={copyLink}
              className="rounded-lg p-2 text-text-muted transition-colors hover:text-text"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
            {onOpenReadingMode && (
              <button
                onClick={onOpenReadingMode}
                className="rounded-lg p-2 text-text-muted transition-colors hover:text-text"
                title="Reading Mode"
              >
                <BookOpenText className="h-4 w-4" />
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-text-muted transition-colors hover:text-text"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="article-reader-content" className="flex-1 overflow-y-auto px-6 py-6 sm:px-10">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-text-muted">Loading article...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <BookOpen className="mb-4 h-8 w-8 text-text-muted" />
              <h3 className="mb-2 text-lg font-semibold text-text">Couldn&apos;t load article</h3>
              <p className="mb-2 max-w-sm text-center text-sm text-text-muted">
                This article couldn&apos;t be loaded in reader mode. Here&apos;s the summary:
              </p>
              <div className="mb-6 max-w-lg rounded-xl border border-border bg-bg-card p-4">
                <h2 className="mb-2 text-lg font-bold text-text">{title}</h2>
                <p className="text-sm leading-relaxed text-text-muted">{summary}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <ExternalLink className="h-4 w-4" />
                Open Original
              </a>
            </div>
          )}

          {article && !loading && !error && (
            <article className="mx-auto max-w-2xl">
              <h1 className="mb-4 text-2xl font-bold leading-tight text-text sm:text-3xl">
                {article.title || title}
              </h1>
              {article.author && (
                <p className="mb-6 text-sm text-text-muted">
                  By {article.author}
                  {article.siteName && ` · ${article.siteName}`}
                  {publishedAt && ` · ${new Date(publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                </p>
              )}

              {/* AI Summarizer */}
              <div className="mb-6">
                <ArticleSummarizer
                  url={url}
                  title={article.title || title}
                  content={article.content}
                />
              </div>

              <div
                className={`article-content prose prose-neutral dark:prose-invert max-w-none ${fontSizeClass}`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
              />
            </article>
          )}
        </div>
      </div>

      {/* Overlay click to close */}
      <div className="hidden w-16 shrink-0 lg:block" onClick={onClose} />
    </div>
  );
}
