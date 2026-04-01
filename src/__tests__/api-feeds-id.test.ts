import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockFeed: unknown = { id: "feed-1", name: "AI News", user_id: "user-123" };
let mockFeedError: unknown = null;
let mockItems: unknown[] = [{ id: "item-1", title: "Test", published_at: "2024-01-01" }];
let mockItemsError: unknown = null;
let mockProfile: { plan: string } | null = { plan: "free" };
let mockDeleteError: unknown = null;
let mockUpdateResult: unknown = { id: "feed-1", name: "Updated" };
let mockUpdateError: unknown = null;

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
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockUpdateResult, error: mockUpdateError }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: mockDeleteError }),
          }),
        };
      }
      if (table === "feed_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: mockItems, error: mockItemsError }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProfile }),
            }),
          }),
        };
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }),
  })),
}));

vi.mock("@/lib/usage", () => ({
  getAllowedSchedules: vi.fn((plan: string) => plan === "pro" ? ["daily", "hourly", "realtime"] : ["daily"]),
}));

const { GET, PATCH, DELETE } = await import("@/app/api/feeds/[id]/route");

function makeParams() {
  return { params: Promise.resolve({ id: "feed-1" }) };
}

describe("GET /api/feeds/[id]", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockFeed = { id: "feed-1", name: "AI News", user_id: "user-123" };
    mockFeedError = null;
    mockItems = [{ id: "item-1", title: "Test" }];
    mockItemsError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new NextRequest("http://localhost/api/feeds/feed-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when feed not found", async () => {
    mockFeed = null;
    mockFeedError = { message: "not found" };
    const req = new NextRequest("http://localhost/api/feeds/feed-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("returns feed with items", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("feed");
    expect(body).toHaveProperty("items");
    expect(body.items).toHaveLength(1);
  });

  it("returns 500 when items query fails", async () => {
    mockItemsError = { message: "db error" };
    const req = new NextRequest("http://localhost/api/feeds/feed-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/feeds/[id]", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockFeed = { id: "feed-1" };
    mockFeedError = null;
    mockProfile = { plan: "free" };
    mockUpdateResult = { id: "feed-1", name: "Updated" };
    mockUpdateError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new NextRequest("http://localhost/api/feeds/feed-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1", {
      method: "PATCH",
      body: "not json",
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when no valid fields provided", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid_field: "test" }),
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No valid fields");
  });

  it("returns 403 when free plan tries hourly schedule", async () => {
    mockProfile = { plan: "free" };
    const req = new NextRequest("http://localhost/api/feeds/feed-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: "hourly" }),
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(403);
  });

  it("updates feed successfully", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("feed");
  });
});

describe("DELETE /api/feeds/[id]", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockFeed = { id: "feed-1" };
    mockFeedError = null;
    mockDeleteError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new NextRequest("http://localhost/api/feeds/feed-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when feed not found", async () => {
    mockFeed = null;
    const req = new NextRequest("http://localhost/api/feeds/feed-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("deletes feed successfully", async () => {
    const req = new NextRequest("http://localhost/api/feeds/feed-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    mockDeleteError = { message: "db error" };
    const req = new NextRequest("http://localhost/api/feeds/feed-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(500);
  });
});
