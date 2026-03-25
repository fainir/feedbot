import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { smartSort } from "@/components/feed/smart-sort";

describe("smartSort", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeItem = (id: string, title: string, source: string, hoursAgo: number) => ({
    id,
    title,
    summary: "Summary text for the article.",
    source,
    url: `https://${source}/${id}`,
    publishedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  });

  const items = [
    makeItem("1", "Old Article", "example.com", 48),
    makeItem("2", "Medium Article", "blog.com", 12),
    makeItem("3", "New Article", "news.com", 1),
    makeItem("4", "Ancient Article", "old.com", 200),
  ];

  const defaultPrefs = {
    readSources: new Set<string>(),
    bookmarkedSources: new Set<string>(),
  };

  it("sorts by newest first", () => {
    const result = smartSort(items, "newest", defaultPrefs);
    expect(result[0].id).toBe("3");
    expect(result[result.length - 1].id).toBe("4");
  });

  it("sorts by oldest first", () => {
    const result = smartSort(items, "oldest", defaultPrefs);
    expect(result[0].id).toBe("4");
    expect(result[result.length - 1].id).toBe("3");
  });

  it("handles empty array", () => {
    expect(smartSort([], "newest", defaultPrefs)).toEqual([]);
  });

  it("preserves all items after sorting", () => {
    const result = smartSort(items, "newest", defaultPrefs);
    expect(result).toHaveLength(items.length);
  });

  it("does not mutate original array", () => {
    const original = [...items];
    smartSort(items, "newest", defaultPrefs);
    expect(items).toEqual(original);
  });
});
