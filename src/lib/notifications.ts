import { Resend } from "resend";
import type { Feed, FeedItem } from "@/types/database";
import { getServiceClient } from "@/lib/supabase";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailHtml(feedName: string, items: FeedItem[]): string {
  const itemsHtml = items
    .slice(0, 20)
    .map(
      (item) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
          <a href="${escapeHtml(item.url)}" style="color: #111; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${escapeHtml(item.title)}
          </a>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px; line-height: 1.4;">
            ${escapeHtml(item.summary)}
          </p>
          <p style="margin: 4px 0 0; color: #999; font-size: 12px;">
            ${item.source} &middot; ${new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </td>
      </tr>`
    )
    .join("");

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h2 style="color: #111; margin-bottom: 4px;">New items in ${escapeHtml(feedName)}</h2>
      <p style="color: #666; margin-top: 0;">${items.length} new item${items.length === 1 ? "" : "s"} found</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="color: #999; font-size: 12px; margin-top: 24px; text-align: center;">
        Sent by MyFeed &middot; <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://myfeed.app"}" style="color: #999;">Manage your feeds</a>
      </p>
    </div>
  `;
}

function buildWhatsAppMessage(feedName: string, items: FeedItem[]): string {
  const header = `*New items in ${feedName}* (${items.length} item${items.length === 1 ? "" : "s"})\n\n`;

  const itemLines = items
    .slice(0, 10)
    .map((item, i) => `${i + 1}. *${item.title}*\n${item.summary}\n${item.url}`)
    .join("\n\n");

  const footer =
    items.length > 10
      ? `\n\n_...and ${items.length - 10} more. View all at ${process.env.NEXT_PUBLIC_APP_URL || "https://myfeed.app"}_`
      : "";

  return header + itemLines + footer;
}

export async function sendEmailNotification(
  to: string,
  feedName: string,
  items: FeedItem[]
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("Resend API key not configured, skipping email notification");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "MyFeed <notifications@myfeed.app>",
      to,
      subject: `${feedName}: ${items.length} new item${items.length === 1 ? "" : "s"}`,
      html: buildEmailHtml(feedName, items),
    });

    if (error) {
      console.error("Failed to send email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

export async function sendWhatsAppNotification(
  to: string,
  feedName: string,
  items: FeedItem[]
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio credentials not configured, skipping WhatsApp notification");
    return false;
  }

  try {
    const message = buildWhatsAppMessage(feedName, items);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      From: fromNumber,
      To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Failed to send WhatsApp message:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return false;
  }
}

export async function notifyFeedUpdate(
  feed: Feed,
  newItems: FeedItem[]
): Promise<void> {
  if (newItems.length === 0) return;

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", feed.user_id)
    .single();

  if (!user) {
    console.error(`User ${feed.user_id} not found for feed ${feed.id}`);
    return;
  }

  const notifications: Array<{
    channel: "email" | "whatsapp";
    send: () => Promise<boolean>;
  }> = [];

  if (feed.notify_email && user.email) {
    notifications.push({
      channel: "email",
      send: () => sendEmailNotification(user.email, feed.name, newItems),
    });
  }

  if (feed.notify_whatsapp) {
    const { data: profile } = await supabase
      .from("users")
      .select("whatsapp_number")
      .eq("id", feed.user_id)
      .single();

    const whatsappNumber = (profile as Record<string, unknown> | null)
      ?.whatsapp_number as string | undefined;

    if (whatsappNumber) {
      notifications.push({
        channel: "whatsapp",
        send: () =>
          sendWhatsAppNotification(whatsappNumber, feed.name, newItems),
      });
    }
  }

  const results = await Promise.allSettled(
    notifications.map(async (n) => {
      const success = await n.send();
      await supabase.from("notifications").insert({
        user_id: feed.user_id,
        feed_id: feed.id,
        channel: n.channel,
        status: success ? "sent" : "failed",
        content: `${newItems.length} new item${newItems.length === 1 ? "" : "s"} in ${feed.name}`,
        sent_at: success ? new Date().toISOString() : null,
      });
      return { channel: n.channel, success };
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Notification failed:", result.reason);
    }
  }
}
