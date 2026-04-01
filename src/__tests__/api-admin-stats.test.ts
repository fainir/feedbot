import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock state ---

let mockUser: { id: string; email: string } | null = { id: "user-123", email: "admin@test.com" };

const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    count: "exact",
    head: true,
  }),
}));

// Always return mock chain for service client
const mockServiceFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: [], error: null, count: 5 }),
}));

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null, count: 10 }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        count: undefined,
        head: undefined,
      }),
    })),
  })),
}));

// Set ADMIN_EMAILS before importing the route
vi.stubEnv("ADMIN_EMAILS", "admin@test.com,boss@test.com");

const { GET } = await import("@/app/api/admin/stats/route");

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    mockUser = { id: "user-123", email: "admin@test.com" };
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 403 for non-admin user", async () => {
    mockUser = { id: "user-456", email: "random@test.com" };
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when user has no email", async () => {
    mockUser = { id: "user-789", email: "" };
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns stats for admin user", async () => {
    mockUser = { id: "user-123", email: "admin@test.com" };
    const res = await GET();
    // The response should be 200 even if the db queries return empty
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totals");
    expect(body).toHaveProperty("plans");
    expect(body).toHaveProperty("schedules");
    expect(body).toHaveProperty("dailySignups");
    expect(body).toHaveProperty("dailyFeeds");
  });

  it("is case-insensitive for admin email matching", async () => {
    mockUser = { id: "user-123", email: "ADMIN@TEST.COM" };
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
