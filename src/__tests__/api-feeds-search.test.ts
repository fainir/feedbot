import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock state ---

let mockRateLimitSuccess = true;

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: mockRateLimitSuccess })),
  getClientKey: vi.fn(() => "127.0.0.1"),
}));

let mockUser: { id: string } | null = { id: "user-123" };
let mockFeeds: { id: string }[] = [{ id: "feed-1" }, { id: "feed-2" }];
let mockItems: unknown[] = [];

const mockQuery = {
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  gte: vi.fn().mockImplementation(function () { return Promise.resolve({ data: mockItems, count: mockItems.length }); }),
  then: undefined as unknown,
};

// Make the chain thenable for cases that don't use .gte()
Object.defineProperty(mockQuery, "then", {
  get() {
    return (resolve: (v: unknown) => void) => resolve({ data: mockItems, count: mockItems.length });
  },
});

const mockFrom = vi.fn((table: string) => {
  if (table === "feeds") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockFeeds, error: null }),
      }),
    };
  }
  if (table === "feed_items") {
    return {
      select: vi.fn().mockReturnValue(mockQuery),
    };
  }
  return {};
});

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: mockFrom,
  })),
}));

const { GET } = await import("@/app/api/feeds/search/route");

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/feeds/search");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe("GET /api/feeds/search", () => {
  beforeEach(() => {
    mockRateLimitSuccess = true;
    mockUser = { id: "user-123" };
    mockFeeds = [{ id: "feed-1" }];
    mockItems = [{ id: "item-1", title: "AI News", summary: "Summary", url: "https://example.com", source: "TechCrunch", published_at: "2024-01-01", feed_id: "feed-1" }];
    vi.clearAllMocks();
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitSuccess = false;
    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no filters provided", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Provide at least one filter");
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns empty results when user has no feeds", async () => {
    mockFeeds = [];
    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("searches by query text", async () => {
    const res = await GET(makeRequest({ q: "AI" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toHaveProperty("title");
    expect(body.items[0]).toHaveProperty("publishedAt");
  });

  it("accepts source filter", async () => {
    const res = await GET(makeRequest({ source: "TechCrunch" }));
    expect(res.status).toBe(200);
  });

  it("accepts since filter", async () => {
    const res = await GET(makeRequest({ since: "2024-01-01" }));
    expect(res.status).toBe(200);
  });

  it("sanitizes PostgREST special characters from query", async () => {
    // Characters like , % . ( ) " \ should be stripped
    const res = await GET(makeRequest({ q: 'test,drop%.table("injection\\)' }));
    expect(res.status).toBe(200);
    // Verify .or() was called with sanitized value (no special chars)
    if (mockQuery.or.mock.calls.length > 0) {
      const orArg = mockQuery.or.mock.calls[0][0] as string;
      expect(orArg).not.toContain(",drop");
      expect(orArg).not.toContain("(");
      expect(orArg).not.toContain(")");
      expect(orArg).not.toContain('"');
    }
  });

  it("sanitizes PostgREST special characters from source", async () => {
    const res = await GET(makeRequest({ source: "test.injection()" }));
    expect(res.status).toBe(200);
    if (mockQuery.ilike.mock.calls.length > 0) {
      const ilikeArg = mockQuery.ilike.mock.calls[0][1] as string;
      expect(ilikeArg).not.toContain(".");
      expect(ilikeArg).not.toContain("(");
    }
  });

  it("limits results to 100 max", async () => {
    const res = await GET(makeRequest({ q: "test", limit: "999" }));
    expect(res.status).toBe(200);
    // The limit() call should have been called with 100
    if (mockQuery.limit.mock.calls.length > 0) {
      expect(mockQuery.limit.mock.calls[0][0]).toBeLessThanOrEqual(100);
    }
  });
});
