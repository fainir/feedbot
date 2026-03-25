/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";

// Test the source counting logic extracted from the dashboard
describe("source analytics logic", () => {
  function computeSourceCounts(items: { source: string; url: string }[]) {
    const sourceCounts: Record<string, number> = {};
    for (const item of items) {
      let domain = item.source;
      try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
      sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
    }
    return Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  it("counts sources correctly", () => {
    const items = [
      { source: "TechCrunch", url: "https://techcrunch.com/a" },
      { source: "TechCrunch", url: "https://techcrunch.com/b" },
      { source: "Hacker News", url: "https://news.ycombinator.com/c" },
    ];
    const result = computeSourceCounts(items);
    expect(result).toEqual([
      ["techcrunch.com", 2],
      ["news.ycombinator.com", 1],
    ]);
  });

  it("strips www from hostnames", () => {
    const items = [
      { source: "Test", url: "https://www.example.com/a" },
    ];
    const result = computeSourceCounts(items);
    expect(result[0][0]).toBe("example.com");
  });

  it("handles invalid URLs gracefully", () => {
    const items = [
      { source: "Local Source", url: "not-a-url" },
    ];
    const result = computeSourceCounts(items);
    expect(result[0][0]).toBe("Local Source");
  });

  it("limits to top 10", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      source: `Source ${i}`,
      url: `https://source${i}.com/article`,
    }));
    const result = computeSourceCounts(items);
    expect(result).toHaveLength(10);
  });

  it("returns empty for no items", () => {
    expect(computeSourceCounts([])).toEqual([]);
  });
});
