import { PLANS } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase";

export async function canCreateFeed(userId: string): Promise<boolean> {
  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = (profile?.plan as keyof typeof PLANS) ?? "free";
  const maxFeeds = PLANS[plan].maxFeeds;

  if (maxFeeds === Infinity) return true;

  const { count } = await supabase
    .from("feeds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return (count ?? 0) < maxFeeds;
}

export function getAllowedSchedules(
  plan: string
): ("daily" | "hourly" | "realtime")[] {
  switch (plan) {
    case "pro":
      return ["daily", "hourly", "realtime"];
    case "free":
    default:
      return ["daily"];
  }
}

export function getAllowedNotifications(plan: string): string[] {
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig) return PLANS.free.notifications;
  return planConfig.notifications;
}
