import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockRateLimitSuccess = true;
let mockUser: { id: string } | null = { id: "user-123" };
let mockFetchResponse: { ok: boolean; headers: Headers; text: () => Promise<string> };

const defaultHtml = `<html><head>
<link type="application/rss+xml" href="/feed.xml" title="Blog RSS" />
</head><body>Hello</body></html>`;

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: mockRateLimitSuccess, limit: 10, remaining: 9, resetAt: Date.now() + 60000 })),
  getClientKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
  })),
}));

// Mock global fetch
const originalFetch = globalThis.fetch;
globalThis.fetch = vi.fn(async () => mockFetchResponse) as unknown as typeof fetch;

const { POST } = await import("@/app/api/feeds/discover/route");

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/feeds/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feeds/discover", () => {
  beforeEach(() => {
    mockRateLimitSuccess = true;
    mockUser = { id: "user-123" };
    mockFetchResponse = {
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => defaultHtml,
    };
    vi.clearAllMocks();
  });

  // --- Rate Limiting & Auth ---

  it("returns 429 when rate limited", async () => {
    mockRateLimitSuccess = false;
    const res = await POST(makeRequest({ url: "https://example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await POST(makeRequest({ url: "https://example.com" }));
    expect(res.status).toBe(401);
  });

  // --- Validation ---

  it("returns 400 when URL missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/feeds/discover", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid URL", async () => {
    const res = await POST(makeRequest({ url: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-HTTP protocol", async () => {
    const res = await POST(makeRequest({ url: "ftp://example.com" }));
    expect(res.status).toBe(400);
  });

  // --- SSRF Protection ---

  it("blocks localhost", async () => {
    const res = await POST(makeRequest({ url: "http://localhost/admin" }));
    expect(res.status).toBe(400);
  });

  it("blocks private IP ranges", async () => {
    const res = await POST(makeRequest({ url: "http://10.0.0.1/internal" }));
    expect(res.status).toBe(400);
  });

  it("blocks cloud metadata endpoint", async () => {
    const res = await POST(makeRequest({ url: "http://169.254.169.254/latest/meta-data/" }));
    expect(res.status).toBe(400);
  });

  // --- Feed Discovery ---

  it("discovers RSS feed from HTML link tags", async () => {
    const res = await POST(makeRequest({ url: "https://blog.example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feeds).toHaveLength(1);
    expect(body.feeds[0].title).toBe("Blog RSS");
    expect(body.feeds[0].url).toContain("/feed.xml");
    expect(body.feeds[0].type).toBe("rss");
    expect(body.source).toBe("blog.example.com");
  });

  it("detects direct RSS/XML content", async () => {
    mockFetchResponse = {
      ok: true,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      text: async () => `<?xml version="1.0"?><rss><channel><title>My Feed</title></channel></rss>`,
    };
    const res = await POST(makeRequest({ url: "https://example.com/feed.xml" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feeds.length).toBeGreaterThanOrEqual(1);
    expect(body.feeds[0].type).toBe("rss");
  });

  it("returns empty feeds when no RSS found and fetch fails", async () => {
    mockFetchResponse = {
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => `<html><body>No feeds here</body></html>`,
    };
    // Override fetch to return not found for common paths
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("example.com")) {
        if (url === "https://example.com/no-feeds") {
          return mockFetchResponse;
        }
        // Common paths should return 404
        return { ok: false, headers: new Headers(), text: async () => "" };
      }
      return mockFetchResponse;
    });
    const res = await POST(makeRequest({ url: "https://example.com/no-feeds" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feeds).toBeDefined();
  });

  it("returns 400 when external fetch fails", async () => {
    mockFetchResponse = {
      ok: false,
      headers: new Headers(),
      text: async () => "",
    };
    const res = await POST(makeRequest({ url: "https://down.example.com" }));
    expect(res.status).toBe(400);
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});
