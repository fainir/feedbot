export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Feed {
  id: string;
  user_id: string;
  name: string;
  description: string;
  query_text: string;
  schedule: "daily" | "hourly" | "realtime";
  notify_email: boolean;
  notify_push: boolean;
  notify_whatsapp: boolean;
  is_active: boolean;
  last_refreshed_at: string | null;
  created_at: string;
}

export interface FeedItem {
  id: string;
  feed_id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  feed_id: string;
  channel: "email" | "push" | "whatsapp";
  status: "pending" | "sent" | "failed";
  content: string;
  sent_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan: "free" | "pro";
  status: "active" | "canceled" | "past_due" | "incomplete";
  current_period_end: string;
  created_at: string;
}
