"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, ExternalLink, Users, UserPlus, UserMinus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  publishedAt: string;
}

interface FeedMeta {
  id: string;
  name: string;
  description: string;
  creator: string;
  followers: number;
}

export default function CommunityFeedPage() {
  const params = useParams();
  const feedId = params.id as string;
  const [meta, setMeta] = useState<FeedMeta | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      // Load feed metadata from community API
      const metaRes = await fetch("/api/public/community");
      const metaData = await metaRes.json();
      const feedMeta = (metaData.feeds || []).find((f: FeedMeta) => f.id === feedId);
      if (feedMeta) setMeta(feedMeta);

      // Load feed items — use the public feeds API with the feed's query
      const itemsRes = await fetch(`/api/public/feed-by-id?id=${feedId}`);
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [feedId]);

  useEffect(() => {
    loadFeed();
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, [loadFeed]);

  const handleFollow = async () => {
    const method = following ? "DELETE" : "POST";
    await fetch(`/api/feeds/${feedId}/follow`, { method });
    setFollowing(!following);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border flex items-center h-11 px-3 gap-3">
        <Link href="/explore" className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{meta?.name || "Community Feed"}</h1>
        </div>
        {isLoggedIn && (
          <button onClick={handleFollow} className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-all ${following ? "bg-bg-hover text-text-muted border border-border" : "bg-text text-bg"}`}>
            {following ? <UserMinus className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
            {following ? "Unfollow" : "Follow"}
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {meta && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1">{meta.name}</h2>
            <p className="text-sm text-text-muted mb-2">{meta.description}</p>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>by {meta.creator}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{meta.followers} followers</span>
            </div>
          </div>
        )}

        {items.length === 0 && !loading && (
          <p className="text-center text-text-muted text-sm py-12">This feed is building up. Check back soon.</p>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-xl border border-border bg-bg-card hover:border-text/20 hover:bg-bg-hover/50 transition-all group">
              <div className="flex gap-3">
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium leading-snug mb-1 group-hover:text-text/80 transition-colors line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-text-muted line-clamp-2 mb-1.5">{item.summary}</p>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{item.source}</span>
                    <span>{timeAgo(item.publishedAt)}</span>
                    <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
