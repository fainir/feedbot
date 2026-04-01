import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockOriginalFeed: unknown = { name: "AI News", query_text: "ai news", description: "AI feed" };
let mockNewFeed: unknown = { id: "feed-2", name: "AI News (copy)", query_text: "ai news", description: "AI feed" };
let mockInsertError: unknown = null;

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockOriginalFeed }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockNewFeed, error: mockInsertError }),
        }),
      }),
    })),
  })),
}));

const { POST } = await import("@/app/api/feeds/[id]/duplicate/route");

function makeParams() {
  return { params: Promise.resolve({ id: "feed-1" }) };
}

describe("POST /api/feeds/[id]/duplicate", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockOriginalFeed = { name: "AI News", query_text: "ai news", description: "AI feed" };
    mockNewFeed = { id: "feed-2", name: "AI News (copy)" };
    mockInsertError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new Request("http://localhost/api/feeds/feed-1/duplicate", { method: "POST" });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when feed not found", async () => {
    mockOriginalFeed = null;
    const req = new Request("http://localhost/api/feeds/feed-1/duplicate", { method: "POST" });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("duplicates feed successfully", async () => {
    const req = new Request("http://localhost/api/feeds/feed-1/duplicate", { method: "POST" });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("feed");
    expect(body.feed.name).toBe("AI News (copy)");
  });

  it("returns 500 when insert fails", async () => {
    mockInsertError = { message: "db error" };
    mockNewFeed = null;
    const req = new Request("http://localhost/api/feeds/feed-1/duplicate", { method: "POST" });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(500);
  });
});
