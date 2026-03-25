import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { applyFilter } from "@/components/feed/filter-chips";

const makeItem = (id: string, summary: string, hoursAgo: number) => ({
  id,
  summary,
  publishedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
});

describe("applyFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const items = [
    makeItem("1", "Short summary", 2),         // today, quick read
    makeItem("2", Array(50).fill("word").join(" "), 2),  // today, long read
    makeItem("3", "Old article", 48),           // 2 days ago
    makeItem("4", "Week old article", 150),     // ~6 days ago
    makeItem("5", "Very old article", 200),     // ~8 days ago
  ];
  const readIds = new Set(["1", "3"]);

  it("returns all items for 'all' filter", () => {
    expect(applyFilter(items, "all", readIds)).toHaveLength(5);
  });

  it("filters to today's items", () => {
    const result = applyFilter(items, "today", readIds);
    expect(result.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("filters to this week's items", () => {
    const result = applyFilter(items, "this-week", readIds);
    expect(result.map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("filters to unread items", () => {
    const result = applyFilter(items, "unread", readIds);
    expect(result.map((i) => i.id)).toEqual(["2", "4", "5"]);
  });

  it("filters long reads (> 40 words)", () => {
    const result = applyFilter(items, "long-reads", readIds);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters quick reads (<= 40 words)", () => {
    const result = applyFilter(items, "quick-reads", readIds);
    expect(result).toHaveLength(4);
  });

  it("handles empty items array", () => {
    expect(applyFilter([], "today", new Set())).toEqual([]);
  });

  it("handles empty readIds", () => {
    const result = applyFilter(items, "unread", new Set());
    expect(result).toHaveLength(5);
  });
});
