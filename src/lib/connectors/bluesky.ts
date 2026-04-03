import type { PlatformConnector, PlatformConnection, InterestSignal, PlatformContent } from "./types";

/**
 * Bluesky connector via AT Protocol.
 * Full feed access, free, no approval needed.
 * Uses app password auth (simpler than OAuth for MVP).
 */
export const blueskyConnector: PlatformConnector = {
  platform: "bluesky",
  name: "Bluesky",
  icon: "https://bsky.app/static/favicon-32x32.png",
  description: "Import your Bluesky timeline and follows",

  async extractSignals(connection: PlatformConnection): Promise<InterestSignal[]> {
    const signals: InterestSignal[] = [];

    try {
      // Get follows (who the user follows = interests)
      const follows = await bskyRequest(
        connection,
        `app.bsky.graph.getFollows?actor=${connection.platform_user_id}&limit=100`
      );

      for (const follow of follows?.follows || []) {
        signals.push({
          platform: "bluesky",
          signal_type: "follow",
          content: follow.displayName || follow.handle,
          weight: 70,
        });
      }

      // Get recent likes (what they engage with)
      const likes = await bskyRequest(
        connection,
        `app.bsky.feed.getActorLikes?actor=${connection.platform_user_id}&limit=50`
      );

      for (const item of likes?.feed || []) {
        const post = item.post;
        if (post?.record?.text) {
          signals.push({
            platform: "bluesky",
            signal_type: "like",
            content: post.record.text.slice(0, 200),
            weight: 85,
          });
        }
      }
    } catch (err) {
      console.error("Bluesky signal extraction failed:", err);
    }

    return signals;
  },

  async fetchContent(connection: PlatformConnection, limit = 50): Promise<PlatformContent[]> {
    try {
      const timeline = await bskyRequest(
        connection,
        `app.bsky.feed.getTimeline?limit=${limit}`
      );

      return (timeline?.feed || []).map((item: BskyFeedItem) => {
        const post = item.post;
        const images = post.embed?.images || [];
        return {
          title: (post.record?.text || "").slice(0, 100),
          url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`,
          summary: post.record?.text || "",
          source: `@${post.author.handle}`,
          image_url: images[0]?.thumb || undefined,
          published_at: post.record?.createdAt || new Date().toISOString(),
          platform: "bluesky" as const,
          engagement: post.likeCount || 0,
        };
      });
    } catch (err) {
      console.error("Bluesky content fetch failed:", err);
      return [];
    }
  },
};

interface BskyFeedItem {
  post: {
    uri: string;
    author: { handle: string; displayName?: string };
    record?: { text?: string; createdAt?: string };
    embed?: { images?: { thumb?: string }[] };
    likeCount?: number;
  };
}

async function bskyRequest(connection: PlatformConnection, endpoint: string) {
  const res = await fetch(
    `https://bsky.social/xrpc/${endpoint}`,
    {
      headers: { Authorization: `Bearer ${connection.access_token}` },
    }
  );
  if (!res.ok) throw new Error(`Bluesky API ${res.status}`);
  return res.json();
}
