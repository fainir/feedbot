import type { PlatformConnector, PlatformConnection, InterestSignal, PlatformContent } from "./types";

/**
 * Reddit connector via OAuth 2.0.
 * Reads subscriptions, saved posts, upvoted content.
 * Free for non-commercial use (100 req/min).
 */
export const redditConnector: PlatformConnector = {
  platform: "reddit",
  name: "Reddit",
  icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
  description: "Import subreddit subscriptions and saved posts",

  async extractSignals(connection: PlatformConnection): Promise<InterestSignal[]> {
    const signals: InterestSignal[] = [];

    try {
      // Subscribed subreddits = strong interest signals
      const subs = await redditRequest(connection, "subreddits/mine/subscriber?limit=100");
      for (const sub of subs?.data?.children || []) {
        signals.push({
          platform: "reddit",
          signal_type: "subscribe",
          content: `r/${sub.data.display_name}: ${sub.data.public_description?.slice(0, 100) || sub.data.title}`,
          weight: 80,
        });
      }

      // Saved posts = high engagement signals
      const saved = await redditRequest(connection, `user/${connection.platform_username}/saved?limit=50`);
      for (const item of saved?.data?.children || []) {
        signals.push({
          platform: "reddit",
          signal_type: "save",
          content: item.data.title || item.data.body?.slice(0, 200) || "",
          weight: 90,
        });
      }

      // Upvoted = engagement signals
      const upvoted = await redditRequest(connection, `user/${connection.platform_username}/upvoted?limit=50`);
      for (const item of upvoted?.data?.children || []) {
        signals.push({
          platform: "reddit",
          signal_type: "like",
          content: item.data.title || "",
          weight: 75,
        });
      }
    } catch (err) {
      console.error("Reddit signal extraction failed:", err);
    }

    return signals;
  },

  async fetchContent(connection: PlatformConnection, limit = 50): Promise<PlatformContent[]> {
    try {
      // Home feed (personalized based on subscriptions)
      const feed = await redditRequest(connection, `best?limit=${limit}`);

      return (feed?.data?.children || []).map((item: RedditPost) => ({
        title: item.data.title,
        url: item.data.url?.startsWith("http") ? item.data.url : `https://reddit.com${item.data.permalink}`,
        summary: item.data.selftext?.slice(0, 300) || "",
        source: `r/${item.data.subreddit}`,
        image_url: item.data.thumbnail?.startsWith("http") ? item.data.thumbnail : undefined,
        published_at: new Date(item.data.created_utc * 1000).toISOString(),
        platform: "reddit" as const,
        engagement: item.data.score || 0,
      }));
    } catch (err) {
      console.error("Reddit content fetch failed:", err);
      return [];
    }
  },
};

interface RedditPost {
  data: {
    title: string;
    url?: string;
    permalink: string;
    selftext?: string;
    subreddit: string;
    thumbnail?: string;
    created_utc: number;
    score?: number;
  };
}

async function redditRequest(connection: PlatformConnection, endpoint: string) {
  const res = await fetch(`https://oauth.reddit.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "User-Agent": "MyFeed/1.0",
    },
  });
  if (!res.ok) throw new Error(`Reddit API ${res.status}`);
  return res.json();
}
