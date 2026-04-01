import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockFeed: unknown = { id: "feed-1", name: "AI News", query_text: "AI", user_id: "user-123" };
let mockFeedError: unknown = null;
let mockRefreshResult: unknown[] = [];
let mockExistingUrls: { url: string }[] = [];
let mockInsertError: unknown = null;
let mockRateLimitSuccess = true;

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: mockRateLimitSuccess, limit: 10, remaining: 9, resetAt: Date.now() + 60000 })),
  getClientKey: vi.fn(() => "127.0.0.1"),
}));

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
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "feed_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockExistingUrls }),
          }),
        };
      }
      return {};
    }),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: mockInsertError }),
    })),
  })),
}));

vi.mock("@/lib/feed-engine", () => ({
  refreshFeed: vi.fn(async () => mockRefreshResult),
}));

const { POST } = await import("@/app/api/feeds/[id]/refresh/route");

function makeRequest() {
  return new NextRequest("http://localhost/api/feeds/feed-1/refresh", { method: "POST" });
}

function makeParams() {
  return { params: Promise.resolve({ id: "feed-1" }) };
}

describe("POST /api/feeds/[id]/refresh", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockFeed = { id: "feed-1", name: "AI News", query_text: "AI", user_id: "user-123" };
    mockFeedError = null;
    mockRefreshResult = [];
    mockExistingUrls = [];
    mockInsertError = null;
    mockRateLimitSuccess = true;
    vi.clearAllMocks();
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitSuccess = false;
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Too many");
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when feed not found", async () => {
    mockFeed = null;
    mockFeedError = { message: "not found" };
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns refreshed with 0 items when no new content", async () => {
    mockRefreshResult = [];
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refreshed).toBe(true);
    expect(body.new_items_count).toBe(0);
  });

  it("returns new items after refresh", async () => {
    mockRefreshResult = [
      { title: "New Article", url: "https://example.com/new", summary: "Summary", source: "Test", image_url: null, published_at: "2024-01-01" },
    ];
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refreshed).toBe(true);
    expect(body.new_items_count).toBe(1);
    expect(body.items).toHaveLength(1);
  });

  it("deduplicates items by URL", async () => {
    mockExistingUrls = [{ url: "https://example.com/existing" }];
    mockRefreshResult = [
      { title: "Existing", url: "https://example.com/existing", summary: "S", source: "T", image_url: null, published_at: "2024-01-01" },
      { title: "New", url: "https://example.com/new", summary: "S", source: "T", image_url: null, published_at: "2024-01-01" },
    ];
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.new_items_count).toBe(1);
  });

  it("returns 502 when feed engine throws", async () => {
    vi.mocked((await import("@/lib/feed-engine")).refreshFeed).mockRejectedValueOnce(new Error("API down"));
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Failed to refresh");
  });

  it("returns 500 when insert fails", async () => {
    mockRefreshResult = [
      { title: "New", url: "https://example.com/new", summary: "S", source: "T", image_url: null, published_at: "2024-01-01" },
    ];
    mockInsertError = { message: "DB error" };
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to store");
  });
});
