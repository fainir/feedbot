import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockCanCreate = true;
let mockExistingFeed: unknown = null;
let mockInsertResult: unknown = { id: "new-feed-1" };
let mockInsertError: unknown = null;

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
    from: vi.fn((table: string) => {
      if (table === "feeds") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockExistingFeed }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsertResult, error: mockInsertError }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
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
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

vi.mock("@/lib/usage", () => ({
  canCreateFeed: vi.fn(async () => mockCanCreate),
}));

vi.mock("@/lib/feed-engine", () => ({
  discoverFeeds: vi.fn(async () => []),
}));

const { POST } = await import("@/app/api/feeds/import/route");

const validOPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="TechCrunch" xmlUrl="https://techcrunch.com/feed/" htmlUrl="https://techcrunch.com" />
    <outline text="The Verge" xmlUrl="https://www.theverge.com/rss/index.xml" />
  </body>
</opml>`;

describe("POST /api/feeds/import", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockCanCreate = true;
    mockExistingFeed = null;
    mockInsertResult = { id: "new-feed-1" };
    mockInsertError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: validOPML,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid OPML (no outline or opml tags)", async () => {
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: "<html><body>Not OPML</body></html>",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid OPML");
  });

  it("returns 400 when no feeds found in OPML", async () => {
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: `<opml><body><outline text="Category" /></body></opml>`,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No feeds found");
  });

  it("imports feeds from valid OPML", async () => {
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: validOPML,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(2);
    expect(body.total).toBe(2);
    expect(body.created).toContain("TechCrunch");
    expect(body.created).toContain("The Verge");
  });

  it("skips feeds when plan limit reached", async () => {
    mockCanCreate = false;
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: validOPML,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(0);
    expect(body.skipped).toBe(2);
  });

  it("skips duplicate feed names", async () => {
    mockExistingFeed = { id: "existing-1" };
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: validOPML,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(2);
  });

  it("handles insert failure gracefully", async () => {
    mockInsertError = { message: "db error" };
    mockInsertResult = null;
    const req = new NextRequest("http://localhost/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: validOPML,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(0);
    expect(body.skipped).toBe(2);
  });
});
