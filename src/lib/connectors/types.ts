/**
 * Platform connector types.
 * Each connector extracts "interest signals" from a platform,
 * which are used to enhance AI matching for the user's feeds.
 */

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: PlatformType;
  access_token: string;
  refresh_token?: string;
  platform_user_id?: string;
  platform_username?: string;
  connected_at: string;
  last_synced_at?: string;
}

export type PlatformType =
  | "bluesky"
  | "mastodon"
  | "github"
  | "youtube"
  | "reddit"
  | "hackernews"
  | "twitch"
  | "producthunt";

export interface InterestSignal {
  platform: PlatformType;
  signal_type: "follow" | "like" | "save" | "subscribe" | "star" | "watch";
  content: string; // What was followed/liked/saved
  weight: number;  // 0-100 how strong this signal is
}

export interface PlatformConnector {
  platform: PlatformType;
  name: string;
  icon: string;
  description: string;
  /** Extract interest signals from the connected account */
  extractSignals(connection: PlatformConnection): Promise<InterestSignal[]>;
  /** Fetch content items from the platform for feed inclusion */
  fetchContent(connection: PlatformConnection, limit?: number): Promise<PlatformContent[]>;
}

export interface PlatformContent {
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url?: string;
  published_at: string;
  platform: PlatformType;
  engagement?: number; // likes, upvotes, etc.
}
