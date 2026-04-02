"use client";

import { useState } from "react";

interface PricingCardProps {
  plan: "free" | "pro";
  name: string;
  price: number;
  features: string[];
  currentPlan?: "free" | "pro";
}

export function PricingCard({
  plan,
  name,
  price,
  features,
  currentPlan,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const isCurrentPlan = currentPlan === plan;

  async function handleClick() {
    if (plan === "free") {
      window.location.href = "/dashboard";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        plan === "pro"
          ? "border-primary bg-bg-card shadow-lg shadow-primary/10"
          : "border-border bg-bg-card"
      }`}
    >
      {plan === "pro" && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}

      <h3 className="text-xl font-bold text-text">{name}</h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-text">
          ${price}
        </span>
        {price > 0 && <span className="text-text-muted">/mo</span>}
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-muted">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={handleClick}
        disabled={loading || isCurrentPlan}
        className={`mt-8 w-full rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
          isCurrentPlan
            ? "cursor-default bg-bg-hover text-text-muted"
            : plan === "pro"
              ? "bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
              : "bg-bg-hover text-text hover:bg-border"
        }`}
      >
        {loading
          ? "Loading..."
          : isCurrentPlan
            ? "Current Plan"
            : plan === "free"
              ? "Get Started"
              : "Upgrade to Pro"}
      </button>
    </div>
  );
}
