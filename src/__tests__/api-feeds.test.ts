import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockFeeds: unknown[] = [];
let mockProfile: { plan: string } | null = { plan: "free" };
let mockFeedCount = 0;
let mockInsertedFeed: unknown = null;

const mockFrom = vi.fn((table: string) => {
  if (table === "feeds") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockFeeds, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockInsertedFeed ?? { id: "feed-new", name: "Test Feed" },
            error: null,
          }),
        }),
      }),
    };
  }
  if (table === "profiles") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
        }),
      }),
    };
  }
  if (table === "feed_items") {
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
  }
  return {};
});

// Mock supabase-server (auth client)
vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: mockUser },
          }),
      },
      from: mockFrom,
    })
  ),
}));

// Mock supabase (service client) — used for plan checks and feed_items insert
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile }),
            }),
          }),
        };
      }
      if (table === "feeds") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: mockFeedCount }),
          }),
        };
      }
      if (table === "feed_items") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    },
  }),
}));

// Mock feed-engine
vi.mock("@/lib/feed-engine", () => ({
  discoverFeeds: vi.fn().mockResolvedValue([]),
}));

// Mock usage — we control canCreateFeed via mockFeedCount
vi.mock("@/lib/usage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/usage")>();
  return {
    ...actual,
    canCreateFeed: vi.fn().mockImplementation(async () => mockFeedCount < 3),
    getAllowedSchedules: actual.getAllowedSchedules,
  };
});

const { GET, POST } = await import("@/app/api/feeds/route");

// --- Helpers ---

function makeRequest(
  method: "GET" | "POST",
  body?: unknown
): NextRequest {
  if (body) {
    return new NextRequest("http://localhost/api/feeds", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  return new NextRequest("http://localhost/api/feeds", { method });
}

// --- Tests ---

describe("GET /api/feeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-123" };
    mockFeeds = [];
    mockProfile = { plan: "free" };
    mockFeedCount = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns feeds list for authenticated user", async () => {
    mockFeeds = [
      { id: "feed-1", name: "AI News", query_text: "AI" },
      { id: "feed-2", name: "Tech", query_text: "tech" },
    ];
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.feeds).toHaveLength(2);
  });

  it("returns empty array when user has no feeds", async () => {
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.feeds).toEqual([]);
  });
});

describe("POST /api/feeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-123" };
    mockProfile = { plan: "free" };
    mockFeedCount = 0;
    mockInsertedFeed = { id: "feed-new", name: "Test Feed" };
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await POST(makeRequest("POST", { name: "Test", query_text: "test" }));
    expect(res.status).toBe(401);
  });

  it("creates feed with valid input", async () => {
    const res = await POST(
      makeRequest("POST", { name: "AI News", query_text: "artificial intelligence news" })
    );
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.feed).toBeDefined();
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest("POST", { query_text: "test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when query_text is missing", async () => {
    const res = await POST(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 100 chars", async () => {
    const res = await POST(
      makeRequest("POST", { name: "x".repeat(101), query_text: "test" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when query_text exceeds 500 chars", async () => {
    const res = await POST(
      makeRequest("POST", { name: "Test", query_text: "x".repeat(501) })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when feed limit reached on free plan", async () => {
    mockFeedCount = 3; // Free plan limit
    const res = await POST(
      makeRequest("POST", { name: "Test", query_text: "test" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
