import type { PlatformConnector, PlatformType } from "./types";
import { blueskyConnector } from "./bluesky";
import { githubConnector } from "./github";
import { youtubeConnector } from "./youtube";
import { mastodonConnector } from "./mastodon";
import { redditConnector } from "./reddit";

export type { PlatformType, PlatformConnection, InterestSignal, PlatformContent, PlatformConnector } from "./types";

/** All available platform connectors */
export const connectors: Record<string, PlatformConnector> = {
  bluesky: blueskyConnector,
  github: githubConnector,
  youtube: youtubeConnector,
  mastodon: mastodonConnector,
  reddit: redditConnector,
};

/** Get a specific connector */
export function getConnector(platform: PlatformType): PlatformConnector | undefined {
  return connectors[platform];
}

/** List all connectors for the UI */
export function listConnectors(): { platform: PlatformType; name: string; icon: string; description: string }[] {
  return Object.values(connectors).map((c) => ({
    platform: c.platform,
    name: c.name,
    icon: c.icon,
    description: c.description,
  }));
}
