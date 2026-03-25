import { describe, it, expect } from "vitest";
import { getAllowedSchedules, getAllowedNotifications } from "@/lib/usage";

describe("getAllowedSchedules", () => {
  it("returns only daily for free plan", () => {
    expect(getAllowedSchedules("free")).toEqual(["daily"]);
  });

  it("returns all schedules for pro plan", () => {
    expect(getAllowedSchedules("pro")).toEqual(["daily", "hourly", "realtime"]);
  });

  it("defaults to free for unknown plan", () => {
    expect(getAllowedSchedules("unknown")).toEqual(["daily"]);
  });
});

describe("getAllowedNotifications", () => {
  it("returns email only for free plan", () => {
    expect(getAllowedNotifications("free")).toEqual(["email"]);
  });

  it("returns all channels for pro plan", () => {
    const channels = getAllowedNotifications("pro");
    expect(channels).toContain("email");
    expect(channels).toContain("push");
    expect(channels).toContain("whatsapp");
  });

  it("defaults to free for unknown plan", () => {
    expect(getAllowedNotifications("unknown")).toEqual(["email"]);
  });
});
