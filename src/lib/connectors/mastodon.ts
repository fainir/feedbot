import type { PlatformConnector, PlatformConnection, InterestSignal, PlatformContent } from "./types";

/**
 * Mastodon connector via standard OAuth 2.0.
 * Works on any Mastodon instance. Full timeline access.
 */
export const mastodonConnector: PlatformConnector = {
  platform: "mastodon",
  name: "Mastodon",
  icon: "https://joinmastodon.org/logos/logo-purple.svg",
  description: "Import your Mastodon timeline and follows",

  async extractSignals(connection: PlatformConnection): Promise<InterestSignal[]> {
    const signals: InterestSignal[] = [];
    const instance = connection.platform_user_id?.split("@")[1] || "mastodon.social";

    try {
      // Following list = interests
      const following = await mastoRequest(instance, connection, "accounts/verify_credentials");
      const id = following.id;

      const follows = await mastoRequest(instance, connection, `accounts/${id}/following?limit=80`);
      for (const account of follows) {
        signals.push({
          platform: "mastodon",
          signal_type: "follow",
          content: `${account.display_name || account.username}: ${account.note?.replace(/<[^>]+>/g, "").slice(0, 100) || ""}`,
          weight: 70,
        });
      }

      // Bookmarks = saved content
      const bookmarks = await mastoRequest(instance, connection, "bookmarks?limit=40");
      for (const status of bookmarks) {
        signals.push({
          platform: "mastodon",
          signal_type: "save",
          content: status.content?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
          weight: 90,
        });
      }
    } catch (err) {
      console.error("Mastodon signal extraction failed:", err);
    }

    return signals;
  },

  async fetchContent(connection: PlatformConnection, limit = 40): Promise<PlatformContent[]> {
    const instance = connection.platform_user_id?.split("@")[1] || "mastodon.social";

    try {
      const timeline = await mastoRequest(instance, connection, `timelines/home?limit=${limit}`);

      return timeline.map((status: MastoStatus) => ({
        title: status.content?.replace(/<[^>]+>/g, "").slice(0, 120) || "",
        url: status.url || status.uri,
        summary: status.content?.replace(/<[^>]+>/g, "").slice(0, 300) || "",
        source: `@${status.account.acct}`,
        image_url: status.media_attachments?.[0]?.preview_url,
        published_at: status.created_at,
        platform: "mastodon" as const,
        engagement: (status.favourites_count || 0) + (status.reblogs_count || 0),
      }));
    } catch (err) {
      console.error("Mastodon content fetch failed:", err);
      return [];
    }
  },
};

interface MastoStatus {
  url: string;
  uri: string;
  content?: string;
  created_at: string;
  account: { acct: string };
  media_attachments?: { preview_url?: string }[];
  favourites_count?: number;
  reblogs_count?: number;
}

async function mastoRequest(instance: string, connection: PlatformConnection, endpoint: string) {
  const res = await fetch(`https://${instance}/api/v1/${endpoint}`, {
    headers: { Authorization: `Bearer ${connection.access_token}` },
  });
  if (!res.ok) throw new Error(`Mastodon API ${res.status}`);
  return res.json();
}
