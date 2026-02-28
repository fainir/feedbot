import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customerId = profile.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: { user_id: profile.id },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: PLANS.pro.priceId,
        quantity: 1,
      },
    ],
    success_url: `${req.nextUrl.origin}/dashboard?checkout=success`,
    cancel_url: `${req.nextUrl.origin}/dashboard?checkout=canceled`,
    subscription_data: {
      metadata: { user_id: userId },
    },
    metadata: { user_id: userId },
  });

  return NextResponse.json({ url: session.url });
}
