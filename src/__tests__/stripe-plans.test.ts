import { describe, it, expect } from "vitest";
import { PLANS } from "@/lib/stripe";

describe("PLANS configuration", () => {
  it("free plan has correct limits", () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.maxFeeds).toBe(3);
    expect(PLANS.free.schedule).toBe("daily");
    expect(PLANS.free.notifications).toContain("email");
  });

  it("pro plan has unlimited feeds", () => {
    expect(PLANS.pro.price).toBe(9);
    expect(PLANS.pro.maxFeeds).toBe(Infinity);
    expect(PLANS.pro.schedule).toBe("hourly");
  });

  it("pro plan has all notification channels", () => {
    expect(PLANS.pro.notifications).toContain("email");
    expect(PLANS.pro.notifications).toContain("push");
    expect(PLANS.pro.notifications).toContain("whatsapp");
  });

  it("pro plan has priceId configured", () => {
    // In test env, it will be undefined, but the property should exist
    expect(PLANS.pro).toHaveProperty("priceId");
  });
});
