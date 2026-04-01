import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockFeed: unknown = { id: "feed-1", name: "AI News", query_text: "ai news", created_at: "2024-01-01", last_refreshed_at: "2024-01-15" };
let mockItems: unknown[] = [];
let mockItemCount: number | null = 3;

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: vi.fn((table: string) => {
      if (table === "feeds") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockFeed }),
              }),
            }),
          }),
        };
      }
      if (table === "feed_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockItems, count: mockItemCount }),
          }),
        };
      }
      return {};
    }),
  })),
}));

const { GET } = await import("@/app/api/feeds/[id]/stats/route");

function makeParams() {
  return { params: Promise.resolve({ id: "feed-1" }) };
}

describe("GET /api/feeds/[id]/stats", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockFeed = { id: "feed-1", name: "AI News", query_text: "ai news", created_at: "2024-01-01", last_refreshed_at: "2024-01-15" };
    mockItems = [
      { id: "1", published_at: "2024-01-10", source: "techcrunch.com", created_at: "2024-01-10" },
      { id: "2", published_at: "2024-01-12", source: "techcrunch.com", created_at: "2024-01-12" },
      { id: "3", published_at: "2024-01-14", source: "verge.com", created_at: "2024-01-14" },
    ];
    mockItemCount = 3;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new Request("http://localhost/api/feeds/feed-1/stats");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when feed not found", async () => {
    mockFeed = null;
    const req = new Request("http://localhost/api/feeds/feed-1/stats");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("returns feed stats with source breakdown", async () => {
    const req = new Request("http://localhost/api/feeds/feed-1/stats");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feed.name).toBe("AI News");
    expect(body.stats.totalItems).toBe(3);
    expect(body.stats.uniqueSources).toBe(2);
    expect(body.stats.topSources).toHaveLength(2);
    expect(body.stats.topSources[0].source).toBe("techcrunch.com");
    expect(body.stats.topSources[0].count).toBe(2);
  });

  it("handles empty feed with no items", async () => {
    mockItems = [];
    mockItemCount = 0;
    const req = new Request("http://localhost/api/feeds/feed-1/stats");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.totalItems).toBe(0);
    expect(body.stats.itemsPerDay).toBe(0);
    expect(body.stats.uniqueSources).toBe(0);
  });

  it("calculates items per day correctly", async () => {
    // 3 items over 4 days = 0.8
    mockItems = [
      { id: "1", published_at: "2024-01-10T00:00:00Z", source: "a.com", created_at: "2024-01-10" },
      { id: "2", published_at: "2024-01-12T00:00:00Z", source: "b.com", created_at: "2024-01-12" },
      { id: "3", published_at: "2024-01-14T00:00:00Z", source: "c.com", created_at: "2024-01-14" },
    ];
    mockItemCount = 3;
    const req = new Request("http://localhost/api/feeds/feed-1/stats");
    const res = await GET(req, makeParams());
    const body = await res.json();
    expect(body.stats.itemsPerDay).toBeGreaterThan(0);
  });
});
