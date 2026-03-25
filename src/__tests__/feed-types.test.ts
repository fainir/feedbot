import { describe, it, expect } from "vitest";
import { mapDbItemToFeedItem, FEED_TEMPLATES } from "@/lib/feed-types";

describe("mapDbItemToFeedItem", () => {
  it("maps database fields to FeedItem", () => {
    const dbItem = {
      id: "abc123",
      title: "Test Article",
      summary: "A test summary",
      source: "example.com",
      url: "https://example.com/article",
      published_at: "2026-03-25T10:00:00Z",
      image_url: "https://example.com/img.png",
    };

    const result = mapDbItemToFeedItem(dbItem);

    expect(result.id).toBe("abc123");
    expect(result.title).toBe("Test Article");
    expect(result.summary).toBe("A test summary");
    expect(result.source).toBe("example.com");
    expect(result.url).toBe("https://example.com/article");
    expect(result.publishedAt).toBe("2026-03-25T10:00:00Z");
    expect(result.sourceIcon).toBe("https://example.com/img.png");
  });

  it("falls back to favicon when no image_url", () => {
    const dbItem = {
      id: "abc123",
      title: "Test",
      summary: "Summary",
      source: "example.com",
      url: "https://www.example.com/article",
      published_at: "2026-03-25T10:00:00Z",
    };

    const result = mapDbItemToFeedItem(dbItem);
    expect(result.sourceIcon).toContain("google.com/s2/favicons");
    expect(result.sourceIcon).toContain("example.com");
  });

  it("falls back to created_at when no published_at", () => {
    const dbItem = {
      id: "abc123",
      title: "Test",
      summary: "Summary",
      source: "example.com",
      url: "https://example.com",
      created_at: "2026-03-24T10:00:00Z",
    };

    const result = mapDbItemToFeedItem(dbItem);
    expect(result.publishedAt).toBe("2026-03-24T10:00:00Z");
  });

  it("handles missing URL gracefully", () => {
    const dbItem = {
      id: "abc123",
      title: "Test",
      summary: "Summary",
      source: "example.com",
      url: undefined,
      published_at: "2026-03-25T10:00:00Z",
    };

    // Should not throw
    const result = mapDbItemToFeedItem(dbItem as Record<string, unknown>);
    expect(result.source).toBe("example.com");
  });
});

describe("FEED_TEMPLATES", () => {
  it("has at least 5 templates", () => {
    expect(FEED_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("each template has required fields", () => {
    for (const tpl of FEED_TEMPLATES) {
      expect(tpl.emoji).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.prompt).toBeTruthy();
      expect(tpl.prompt.length).toBeGreaterThan(10);
    }
  });
});
