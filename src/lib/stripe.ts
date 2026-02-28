import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

// Lazy proxy so imports don't crash during build when env vars are missing
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

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
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    maxFeeds: Infinity,
    schedule: "hourly" as const,
    notifications: ["email", "push", "whatsapp"] as string[],
  },
};
