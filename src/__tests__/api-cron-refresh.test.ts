import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockFeeds: unknown[] = [];
let mockExistingItems: { url: string }[] = [];
let mockInsertError: unknown = null;

vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "feeds") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockFeeds, error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "feed_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockExistingItems }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: "item-1", title: "New" }],
              error: mockInsertError,
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

vi.mock("@/lib/feed-engine", () => ({
  refreshFeed: vi.fn(async () => []),
}));

vi.mock("@/lib/notifications", () => ({
  notifyFeedUpdate: vi.fn(async () => {}),
}));

vi.stubEnv("CRON_SECRET", "test-secret-123");

const { GET } = await import("@/app/api/cron/refresh-feeds/route");

function makeRequest(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers["authorization"] = authHeader;
  return new NextRequest("http://localhost/api/cron/refresh-feeds", { headers });
}

describe("GET /api/cron/refresh-feeds", () => {
  beforeEach(() => {
    mockFeeds = [];
    mockExistingItems = [];
    mockInsertError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when no authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret length differs (timing-safe)", async () => {
    const res = await GET(makeRequest("Bearer x"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization format is wrong", async () => {
    const res = await GET(makeRequest("test-secret-123"));
    expect(res.status).toBe(401);
  });

  it("succeeds with correct bearer token", async () => {
    const res = await GET(makeRequest("Bearer test-secret-123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("No active feeds");
  });

  it("returns no feeds due when all recently refreshed", async () => {
    mockFeeds = [
      { id: "feed-1", name: "AI", is_active: true, schedule: "daily", last_refreshed_at: new Date().toISOString() },
    ];
    const res = await GET(makeRequest("Bearer test-secret-123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refreshed).toBe(0);
    expect(body.message).toContain("No feeds due");
  });

  it("refreshes feeds that have never been refreshed", async () => {
    mockFeeds = [
      { id: "feed-1", name: "AI", is_active: true, schedule: "daily", last_refreshed_at: null },
    ];
    const res = await GET(makeRequest("Bearer test-secret-123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.due).toBe(1);
    expect(body.refreshed).toBe(1);
  });

  it("refreshes stale feeds (older than schedule)", async () => {
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
    mockFeeds = [
      { id: "feed-1", name: "AI", is_active: true, schedule: "daily", last_refreshed_at: staleDate },
    ];
    const res = await GET(makeRequest("Bearer test-secret-123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.due).toBe(1);
  });

  it("handles feed refresh errors gracefully", async () => {
    mockFeeds = [
      { id: "feed-1", name: "AI", is_active: true, schedule: "daily", last_refreshed_at: null },
    ];
    vi.mocked((await import("@/lib/feed-engine")).refreshFeed).mockRejectedValueOnce(new Error("API down"));
    const res = await GET(makeRequest("Bearer test-secret-123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
  });
});
