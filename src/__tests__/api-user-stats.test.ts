import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock state ---

let mockUser: { id: string; email: string; created_at: string } | null = {
  id: "user-123",
  email: "user@test.com",
  created_at: "2024-01-01T00:00:00Z",
};
let mockFeeds: unknown[] = [{ id: "feed-1" }, { id: "feed-2" }];
let mockFeedCount: number | null = 2;
let mockItemCount: number | null = 50;

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: vi.fn((table: string) => {
      if (table === "feeds") {
        return {
          select: vi.fn().mockImplementation((cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockResolvedValue({ count: mockFeedCount }),
              };
            }
            return {
              eq: vi.fn().mockResolvedValue({ data: mockFeeds }),
            };
          }),
        };
      }
      if (table === "feed_items") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ count: mockItemCount }),
          }),
        };
      }
      return {};
    }),
  })),
}));

const { GET } = await import("@/app/api/user/stats/route");

describe("GET /api/user/stats", () => {
  beforeEach(() => {
    mockUser = { id: "user-123", email: "user@test.com", created_at: "2024-01-01T00:00:00Z" };
    mockFeeds = [{ id: "feed-1" }, { id: "feed-2" }];
    mockFeedCount = 2;
    mockItemCount = 50;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user stats", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe("user-123");
    expect(body.user.email).toBe("user@test.com");
    expect(body.stats.feeds).toBe(2);
    expect(body.stats.totalItems).toBe(50);
    expect(body.stats.itemsPerFeed).toBe(25);
  });

  it("handles user with no feeds", async () => {
    mockFeeds = [];
    mockFeedCount = 0;
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.feeds).toBe(0);
    expect(body.stats.totalItems).toBe(0);
    expect(body.stats.itemsPerFeed).toBe(0);
  });

  it("calculates account age in days", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.user.accountAgeDays).toBeGreaterThan(0);
  });
});
