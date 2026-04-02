import { lemonSqueezySetup, createCheckout, getSubscription, cancelSubscription } from "@lemonsqueezy/lemonsqueezy.js";

let _initialized = false;

function init() {
  if (!_initialized) {
    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
    _initialized = true;
  }
}

export async function createCheckoutUrl(userId: string, email: string) {
  init();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
  const variantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID!;

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutData: {
      email,
      custom: { user_id: userId },
    },
    productOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    },
  });

  if (error) throw new Error(`Checkout error: ${JSON.stringify(error)}`);
  return data?.data?.attributes?.url;
}

export async function getSubscriptionDetails(subscriptionId: string) {
  init();
  const { data, error } = await getSubscription(subscriptionId);
  if (error) throw new Error(`Subscription error: ${JSON.stringify(error)}`);
  return data?.data?.attributes;
}

export async function cancelSub(subscriptionId: string) {
  init();
  return cancelSubscription(subscriptionId);
}

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    maxFeeds: 3,
    schedule: "daily" as const,
    notifications: ["email"] as string[],
  },
  pro: {
    name: "Pro",
    price: 9,
    variantId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
    maxFeeds: Infinity,
    schedule: "hourly" as const,
    notifications: ["email", "push", "whatsapp"] as string[],
  },
};
