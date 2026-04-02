import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (hmac !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventName = event.meta?.event_name;
  const userId = event.meta?.custom_data?.user_id;
  const subscriptionId = event.data?.id;

  if (!userId) return NextResponse.json({ ok: true });

  const supabase = getServiceClient();

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated":
      await supabase
        .from("profiles")
        .update({ plan: "pro", lemon_subscription_id: String(subscriptionId) })
        .eq("id", userId);
      break;

    case "subscription_cancelled":
    case "subscription_expired":
      await supabase
        .from("profiles")
        .update({ plan: "free", lemon_subscription_id: null })
        .eq("id", userId);
      break;
  }

  return NextResponse.json({ ok: true });
}
