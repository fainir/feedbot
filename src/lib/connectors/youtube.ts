import type { PlatformConnector, PlatformConnection, InterestSignal, PlatformContent } from "./types";

/**
 * YouTube connector via Google OAuth.
 * Reads subscriptions, liked videos, playlists.
 * Free, 10K quota/day.
 */
export const youtubeConnector: PlatformConnector = {
  platform: "youtube",
  name: "YouTube",
  icon: "https://www.youtube.com/s/desktop/f506bd45/img/favicon_32x32.png",
  description: "Import subscriptions and liked videos",

  async extractSignals(connection: PlatformConnection): Promise<InterestSignal[]> {
    const signals: InterestSignal[] = [];

    try {
      // Subscriptions = channels they follow = interests
      const subs = await ytRequest(connection, "subscriptions?part=snippet&mine=true&maxResults=50");
      for (const sub of subs?.items || []) {
        signals.push({
          platform: "youtube",
          signal_type: "subscribe",
          content: `YouTube channel: ${sub.snippet.title} - ${sub.snippet.description?.slice(0, 100) || ""}`,
          weight: 75,
        });
      }

      // Liked videos = content engagement
      const likes = await ytRequest(connection, "videos?part=snippet&myRating=like&maxResults=30");
      for (const video of likes?.items || []) {
        signals.push({
          platform: "youtube",
          signal_type: "like",
          content: video.snippet.title,
          weight: 85,
        });
      }
    } catch (err) {
      console.error("YouTube signal extraction failed:", err);
    }

    return signals;
  },

  async fetchContent(connection: PlatformConnection, limit = 25): Promise<PlatformContent[]> {
    try {
      // Get subscription feed (activities)
      const activities = await ytRequest(
        connection,
        `activities?part=snippet,contentDetails&home=true&maxResults=${limit}`
      );

      return (activities?.items || []).map((item: YtActivity) => ({
        title: item.snippet.title,
        url: item.contentDetails?.upload?.videoId
          ? `https://www.youtube.com/watch?v=${item.contentDetails.upload.videoId}`
          : `https://www.youtube.com/channel/${item.snippet.channelId}`,
        summary: item.snippet.description?.slice(0, 200) || "",
        source: item.snippet.channelTitle || "YouTube",
        image_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        published_at: item.snippet.publishedAt,
        platform: "youtube" as const,
        engagement: 0,
      }));
    } catch (err) {
      console.error("YouTube content fetch failed:", err);
      return [];
    }
  },
};

interface YtActivity {
  snippet: {
    title: string;
    description?: string;
    channelId: string;
    channelTitle?: string;
    publishedAt: string;
    thumbnails?: { default?: { url: string }; high?: { url: string } };
  };
  contentDetails?: { upload?: { videoId?: string } };
}

async function ytRequest(connection: PlatformConnection, endpoint: string) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}`, {
    headers: { Authorization: `Bearer ${connection.access_token}` },
  });
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  return res.json();
}
