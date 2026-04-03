import type { PlatformConnector, PlatformConnection, InterestSignal, PlatformContent } from "./types";

/**
 * GitHub connector.
 * Extracts starred repos, watched repos, activity feed.
 * Free, 5000 req/hr, OAuth 2.0.
 */
export const githubConnector: PlatformConnector = {
  platform: "github",
  name: "GitHub",
  icon: "https://github.githubassets.com/favicons/favicon-dark.svg",
  description: "Import starred repos, activity, and tech interests",

  async extractSignals(connection: PlatformConnection): Promise<InterestSignal[]> {
    const signals: InterestSignal[] = [];

    try {
      // Starred repos = strong interest signals
      const starred = await ghRequest(connection, "user/starred?per_page=50&sort=updated");
      for (const repo of starred) {
        signals.push({
          platform: "github",
          signal_type: "star",
          content: `${repo.full_name}: ${repo.description || repo.language || ""}`,
          weight: 80,
        });
        // Language is also a signal
        if (repo.language) {
          signals.push({
            platform: "github",
            signal_type: "star",
            content: `Programming language: ${repo.language}`,
            weight: 60,
          });
        }
      }

      // Watched repos (notifications enabled = high interest)
      const watched = await ghRequest(connection, "user/subscriptions?per_page=30");
      for (const repo of watched) {
        signals.push({
          platform: "github",
          signal_type: "watch",
          content: `${repo.full_name}: ${repo.description || ""}`,
          weight: 90,
        });
      }
    } catch (err) {
      console.error("GitHub signal extraction failed:", err);
    }

    return signals;
  },

  async fetchContent(connection: PlatformConnection, limit = 30): Promise<PlatformContent[]> {
    try {
      // Get activity feed (events)
      const events = await ghRequest(connection, `users/${connection.platform_username}/received_events?per_page=${limit}`);

      return events
        .filter((e: GhEvent) => ["WatchEvent", "ReleaseEvent", "CreateEvent"].includes(e.type))
        .map((e: GhEvent) => ({
          title: formatGhEvent(e),
          url: `https://github.com/${e.repo.name}`,
          summary: e.payload?.release?.body?.slice(0, 200) || e.payload?.description || "",
          source: "GitHub",
          image_url: e.actor?.avatar_url,
          published_at: e.created_at,
          platform: "github" as const,
          engagement: 0,
        }));
    } catch (err) {
      console.error("GitHub content fetch failed:", err);
      return [];
    }
  },
};

interface GhEvent {
  type: string;
  repo: { name: string };
  actor?: { avatar_url?: string };
  payload?: { release?: { body?: string }; description?: string };
  created_at: string;
}

function formatGhEvent(e: GhEvent): string {
  switch (e.type) {
    case "WatchEvent": return `${e.repo.name} starred`;
    case "ReleaseEvent": return `${e.repo.name} new release`;
    case "CreateEvent": return `${e.repo.name} created`;
    default: return `${e.repo.name} activity`;
  }
}

async function ghRequest(connection: PlatformConnection, endpoint: string) {
  const res = await fetch(`https://api.github.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}
