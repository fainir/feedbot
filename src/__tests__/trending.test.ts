import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeTrending } from "@/components/feed/trending-tab";

describe("computeTrending", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeItem = (id: string, title: string, hoursAgo: number) => ({
    id,
    title,
    summary: "A summary of the article about various topics.",
    source: "example.com",
    url: `https://example.com/${id}`,
    publishedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  });

  it("returns empty array for empty input", () => {
    expect(computeTrending([], new Set(), new Set())).toEqual([]);
  });

  it("returns items with scores", () => {
    const items = [makeItem("1", "Test Article", 1)];
    const result = computeTrending(items, new Set(), new Set());
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("score");
    expect(result[0].score).toBeGreaterThan(0);
  });

  it("ranks newer items higher", () => {
    const items = [
      makeItem("old", "Old Article", 48),
      makeItem("new", "New Article", 1),
    ];
    const result = computeTrending(items, new Set(), new Set());
    expect(result[0].id).toBe("new");
  });

  it("boosts bookmarked items", () => {
    const items = [
      makeItem("1", "Regular Article", 5),
      makeItem("2", "Bookmarked Article", 10),
    ];
    const bookmarked = new Set(["2"]);
    const result = computeTrending(items, new Set(), bookmarked);

    const item2 = result.find((i) => i.id === "2")!;
    expect(item2.reasons).toContain("Bookmarked");
  });

  it("marks read items differently", () => {
    const items = [makeItem("1", "Read Article", 1)];
    const readIds = new Set(["1"]);
    const result = computeTrending(items, readIds, new Set());
    // Read items should have lower score due to penalty
    expect(result[0].score).toBeLessThan(
      computeTrending(items, new Set(), new Set())[0].score
    );
  });

  it("identifies just-published items", () => {
    const items = [makeItem("1", "Breaking News", 0.5)]; // 30 min ago
    const result = computeTrending(items, new Set(), new Set());
    expect(result[0].reasons).toContain("Just published");
  });
});
