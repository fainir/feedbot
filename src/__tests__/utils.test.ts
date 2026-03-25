import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readingTime, timeAgo, cn } from "@/lib/utils";

describe("readingTime", () => {
  it("returns 1 min for short text", () => {
    expect(readingTime("Hello world")).toBe("1 min read");
  });

  it("returns correct time for longer text", () => {
    const words = Array(400).fill("word").join(" ");
    expect(readingTime(words)).toBe("2 min read");
  });

  it("returns 1 min for empty text", () => {
    expect(readingTime("")).toBe("1 min read");
  });

  it("handles 200 words as 1 min", () => {
    const words = Array(200).fill("word").join(" ");
    expect(readingTime(words)).toBe("1 min read");
  });

  it("handles 201 words as 2 min", () => {
    const words = Array(201).fill("word").join(" ");
    expect(readingTime(words)).toBe("2 min read");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for recent dates", () => {
    expect(timeAgo("2026-03-25T11:59:30Z")).toBe("just now");
  });

  it("returns minutes for dates within an hour", () => {
    expect(timeAgo("2026-03-25T11:30:00Z")).toBe("30m ago");
  });

  it("returns hours for dates within a day", () => {
    expect(timeAgo("2026-03-25T06:00:00Z")).toBe("6h ago");
  });

  it("returns days for older dates", () => {
    expect(timeAgo("2026-03-22T12:00:00Z")).toBe("3d ago");
  });
});

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});
