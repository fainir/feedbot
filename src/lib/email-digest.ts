import { getServiceClient } from "@/lib/supabase";

type Frequency = "daily" | "weekly" | "never" | "hourly";
type FeedFrequencies = Record<string, { frequency: Frequency; last_sent_at?: string | null }>;

interface DigestArticle {
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  published_at: string;
  feed_name: string;
}

const FREQ_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Send email digests to users who have them enabled.
 * Called by the cron job after scan-and-match.
 */
export async function sendDigests(): Promise<{ sent: number; skipped: number }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("[Digest] RESEND_API_KEY not set, skipping");
    return { sent: 0, skipped: 0 };
  }

  const supabase = getServiceClient();
  let sent = 0;
  let skipped = 0;

  // Get all users with digest enabled
  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("user_id, digest_frequency, feed_ids, feed_frequencies, last_digest_at")
    .eq("digest_enabled", true);

  if (!prefs || prefs.length === 0) return { sent: 0, skipped: 0 };

  for (const pref of prefs) {
    try {
      // Resolve which feeds are DUE for this user using per-feed frequencies
      // when present; fall back to the legacy global digest_frequency model.
      const ff = (pref.feed_frequencies as FeedFrequencies | null) || {};
      const hasPerFeed = Object.keys(ff).length > 0;
      const now = Date.now();

      let dueFeedIds: string[] = [];
      if (hasPerFeed) {
        for (const [feedId, cfg] of Object.entries(ff)) {
          if (!cfg || cfg.frequency === "never") continue;
          const interval = FREQ_MS[cfg.frequency] ?? FREQ_MS.daily;
          const lastSent = cfg.last_sent_at ? new Date(cfg.last_sent_at).getTime() : 0;
          if (now - lastSent >= interval) dueFeedIds.push(feedId);
        }
        if (dueFeedIds.length === 0) { skipped++; continue; }
      } else {
        // Legacy path: check the single global frequency.
        if (!isDueForDigest(pref.digest_frequency, pref.last_digest_at)) {
          skipped++;
          continue;
        }
        dueFeedIds = (pref.feed_ids as string[] | null) ?? [];
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", pref.user_id)
        .single();
      if (!profile?.email) { skipped++; continue; }

      const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";
      let feedQuery = supabase
        .from("feeds")
        .select("id, name")
        .eq("user_id", SYSTEM_USER)
        .eq("is_active", true);
      if (dueFeedIds.length > 0) {
        feedQuery = feedQuery.in("id", dueFeedIds);
      }
      const { data: feeds } = await feedQuery;
      if (!feeds || feeds.length === 0) { skipped++; continue; }

      // For per-feed mode, use each feed's own last_sent_at as its `since`.
      // For legacy mode, use the global last_digest_at.
      const articles: DigestArticle[] = [];
      for (const feed of feeds) {
        const perFeedSince = hasPerFeed
          ? (ff[feed.id]?.last_sent_at ?? new Date(now - 24 * 60 * 60 * 1000).toISOString())
          : (pref.last_digest_at || new Date(now - 24 * 60 * 60 * 1000).toISOString());

        const { data: items } = await supabase
          .from("feed_items")
          .select("title, url, summary, source, image_url, published_at")
          .eq("feed_id", feed.id)
          .gte("published_at", perFeedSince)
          .order("relevance_score", { ascending: false })
          .limit(5);

        if (items) {
          articles.push(...items.map((item) => ({ ...item, feed_name: feed.name })));
        }
      }

      if (articles.length === 0) { skipped++; continue; }

      const html = buildDigestHtml(articles, profile.email);
      await sendEmail(
        resendKey,
        profile.email,
        `Your MyFeed Digest — ${articles.length} new ${articles.length === 1 ? "article" : "articles"}`,
        html,
      );

      // Stamp last_sent_at per feed we just sent (per-feed mode), and the global
      // last_digest_at (legacy column, still used by older clients).
      if (hasPerFeed) {
        const nowIso = new Date(now).toISOString();
        const updated: FeedFrequencies = { ...ff };
        for (const fid of dueFeedIds) {
          if (updated[fid]) updated[fid] = { ...updated[fid], last_sent_at: nowIso };
        }
        await supabase
          .from("email_preferences")
          .update({ feed_frequencies: updated, last_digest_at: nowIso })
          .eq("user_id", pref.user_id);
      } else {
        await supabase
          .from("email_preferences")
          .update({ last_digest_at: new Date(now).toISOString() })
          .eq("user_id", pref.user_id);
      }

      sent++;
    } catch (err) {
      console.error(`[Digest] Failed for user ${pref.user_id}:`, err);
      skipped++;
    }
  }

  return { sent, skipped };
}

function isDueForDigest(frequency: string, lastDigestAt: string | null): boolean {
  if (!lastDigestAt) return true;

  const elapsed = Date.now() - new Date(lastDigestAt).getTime();
  switch (frequency) {
    case "hourly": return elapsed > 60 * 60 * 1000;
    case "daily": return elapsed > 24 * 60 * 60 * 1000;
    case "weekly": return elapsed > 7 * 24 * 60 * 60 * 1000;
    default: return elapsed > 24 * 60 * 60 * 1000;
  }
}

function buildDigestHtml(articles: DigestArticle[], _email: string): string {
  const articleHtml = articles.map((a) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #2f3336;">
        ${a.image_url ? `<img src="${a.image_url}" alt="" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ""}
        <div style="font-size: 11px; color: #71767b; margin-bottom: 4px;">${a.source} · ${a.feed_name}</div>
        <a href="${a.url}" style="color: #e7e9ea; text-decoration: none; font-weight: 600; font-size: 15px; line-height: 1.3;">${a.title}</a>
        ${a.summary ? `<div style="color: #71767b; font-size: 13px; margin-top: 4px; line-height: 1.4;">${a.summary.slice(0, 150)}${a.summary.length > 150 ? "..." : ""}</div>` : ""}
      </td>
    </tr>
  `).join("");

  return `
    <div style="max-width: 600px; margin: 0 auto; background: #000; color: #e7e9ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background: #e7e9ea; color: #000; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; letter-spacing: -0.5px;">MF</span>
        <span style="font-size: 18px; font-weight: 700; margin-left: 8px;">MyFeed Digest</span>
      </div>
      <div style="color: #71767b; text-align: center; font-size: 13px; margin-bottom: 24px;">
        ${articles.length} new articles from your feeds
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${articleHtml}
      </table>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://myfeed.space/dashboard" style="display: inline-block; background: #e7e9ea; color: #000; padding: 10px 24px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 14px;">View all feeds</a>
      </div>
      <div style="text-align: center; margin-top: 16px; color: #71767b; font-size: 11px;">
        <a href="https://myfeed.space/dashboard" style="color: #71767b;">Manage email preferences</a>
      </div>
    </div>
  `;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MyFeed <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${res.status} ${err}`);
  }
}
