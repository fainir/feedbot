import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockFeed: unknown = { id: "feed-1", name: "AI News", description: "AI feed", query_text: "ai news", last_refreshed_at: "2024-01-15T00:00:00Z", user_id: "user-123" };
let mockFeedError: unknown = null;
let mockItems: unknown[] = [
  { id: "item-1", title: "Test Article", summary: "Summary here", url: "https://example.com/article", source: "example.com", published_at: "2024-01-15T12:00:00Z", image_url: null },
];
let mockItemsError: unknown = null;

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: vi.fn((table: string) => {
      if (table === "feeds") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockFeed, error: mockFeedError }),
              }),
            }),
          }),
        };
      }
      if (table === "feed_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockItems, error: mockItemsError }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

const { GET } = await import("@/app/api/feeds/[id]/export/route");

function makeParams() {
  return { params: Promise.resolve({ id: "feed-1" }) };
}

describe("GET /api/feeds/[id]/export", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockFeed = { id: "feed-1", name: "AI News", description: "AI feed", query_text: "ai news", last_refreshed_at: "2024-01-15T00:00:00Z" };
    mockFeedError = null;
    mockItems = [
      { id: "item-1", title: "Test Article", summary: "Summary here", url: "https://example.com/article", source: "example.com", published_at: "2024-01-15T12:00:00Z", image_url: null },
    ];
    mockItemsError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when feed not found", async () => {
    mockFeed = null;
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("returns JSON format when requested", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export?format=json");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feed).toHaveProperty("id");
    expect(body.feed).toHaveProperty("name", "AI News");
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toHaveProperty("title", "Test Article");
    expect(body.items[0]).toHaveProperty("url", "https://example.com/article");
  });

  it("returns RSS XML by default", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("AI News");
    expect(xml).toContain("Test Article");
  });

  it("escapes XML special characters in RSS output", async () => {
    mockFeed = { id: "feed-1", name: "News & \"Updates\"", description: null, query_text: "test <query>", last_refreshed_at: null };
    mockItems = [{ id: "item-1", title: "A & B", summary: "X < Y", url: "https://example.com?a=1&b=2", source: "test \"source\"", published_at: null }];
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export?format=rss");
    const res = await GET(req, makeParams());
    const xml = await res.text();
    // Title and description use CDATA (raw & is fine there)
    // But escaped contexts (channel title, link, source) must use &amp;
    expect(xml).toContain("News &amp; &quot;Updates&quot;");
    expect(xml).toContain("test &lt;query&gt;");
    expect(xml).toContain("test &quot;source&quot;");
  });

  it("handles empty items list", async () => {
    mockItems = [];
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export?format=json");
    const res = await GET(req, makeParams());
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });

  it("sets Cache-Control header on RSS response", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1/export");
    const res = await GET(req, makeParams());
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });
});
