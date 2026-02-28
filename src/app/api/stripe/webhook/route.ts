import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!userId || !subscriptionId) break;

      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);

      const periodEnd = getSubscriptionPeriodEnd(subscription);

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          plan: "pro",
          status: "active",
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );

      await supabase
        .from("profiles")
        .update({ plan: "pro" })
        .eq("id", userId);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) break;

      const status = mapSubscriptionStatus(subscription.status);
      const plan = subscription.status === "active" ? "pro" : "free";
      const periodEnd = getSubscriptionPeriodEnd(subscription);

      await supabase
        .from("subscriptions")
        .update({
          status,
          plan,
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      await supabase
        .from("profiles")
        .update({ plan })
        .eq("id", userId);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) break;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled", plan: "free" })
        .eq("stripe_subscription_id", subscription.id);

      await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("id", userId);

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (!subscriptionId) break;

      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_subscription_id", subscriptionId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}

/**
 * In Stripe API 2026-02-25.clover, current_period_end lives on
 * SubscriptionItem, not on Subscription. Extract it from the first item.
 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number {
  const firstItem = subscription.items.data[0];
  if (firstItem) return firstItem.current_period_end;
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}

/**
 * In Stripe API 2026-02-25.clover, Invoice.subscription was replaced
 * with Invoice.parent.subscription_details.subscription.
 */
function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "incomplete" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "incomplete";
  }
}
