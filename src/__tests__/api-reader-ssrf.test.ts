import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// --- Mock state ---

let mockRateLimitSuccess = true;
let mockFetchResponse: { ok: boolean; text: () => Promise<string> } = {
  ok: true,
  text: async () => "<html><head><title>Test Article</title></head><body><article><p>Content</p></article></body></html>",
};

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: mockRateLimitSuccess, limit: 30, remaining: 29, resetAt: Date.now() + 60000 })),
  getClientKey: vi.fn(() => "127.0.0.1"),
}));

// Mock global fetch for the article fetcher
const originalFetch = globalThis.fetch;
globalThis.fetch = vi.fn(async () => mockFetchResponse) as unknown as typeof fetch;

const { POST } = await import("@/app/api/feed/reader/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/feed/reader", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feed/reader", () => {
  beforeEach(() => {
    mockRateLimitSuccess = true;
    mockFetchResponse = {
      ok: true,
      text: async () => "<html><head><title>Test</title></head><body><article><p>Content here</p></article></body></html>",
    };
    vi.clearAllMocks();
  });

  // --- Auth & Validation ---

  it("returns 429 when rate limited", async () => {
    mockRateLimitSuccess = false;
    const res = await POST(makeRequest({ url: "https://example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when URL is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("URL required");
  });

  it("returns 400 for non-string URL", async () => {
    const res = await POST(makeRequest({ url: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid URL", async () => {
    const res = await POST(makeRequest({ url: "not-a-url" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid URL");
  });

  it("returns 400 for non-http protocol", async () => {
    const res = await POST(makeRequest({ url: "ftp://example.com/file" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid URL protocol");
  });

  // --- SSRF Protection ---

  it("blocks localhost", async () => {
    const res = await POST(makeRequest({ url: "http://localhost/admin" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Private");
  });

  it("blocks 127.0.0.1", async () => {
    const res = await POST(makeRequest({ url: "http://127.0.0.1/secret" }));
    expect(res.status).toBe(400);
  });

  it("blocks 0.0.0.0", async () => {
    const res = await POST(makeRequest({ url: "http://0.0.0.0/" }));
    expect(res.status).toBe(400);
  });

  it("blocks 10.x.x.x private ranges", async () => {
    const res = await POST(makeRequest({ url: "http://10.0.0.1/internal" }));
    expect(res.status).toBe(400);
  });

  it("blocks 192.168.x.x private ranges", async () => {
    const res = await POST(makeRequest({ url: "http://192.168.1.1/" }));
    expect(res.status).toBe(400);
  });

  it("blocks 172.x.x.x private ranges", async () => {
    const res = await POST(makeRequest({ url: "http://172.16.0.1/" }));
    expect(res.status).toBe(400);
  });

  it("blocks AWS metadata endpoint (169.254.169.254)", async () => {
    const res = await POST(makeRequest({ url: "http://169.254.169.254/latest/meta-data/" }));
    expect(res.status).toBe(400);
  });

  it("blocks GCP metadata endpoint", async () => {
    const res = await POST(makeRequest({ url: "http://metadata.google.internal/computeMetadata/v1/" }));
    expect(res.status).toBe(400);
  });

  it("blocks IPv6 loopback", async () => {
    const res = await POST(makeRequest({ url: "http://[::1]/admin" }));
    expect(res.status).toBe(400);
  });

  // --- Successful fetching ---

  it("fetches and extracts article from valid URL", async () => {
    const res = await POST(makeRequest({ url: "https://example.com/article" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("title");
    expect(body).toHaveProperty("content");
    expect(body).toHaveProperty("wordCount");
  });

  it("returns 502 when fetch fails", async () => {
    mockFetchResponse = { ok: false, text: async () => "" };
    const res = await POST(makeRequest({ url: "https://example.com/down" }));
    expect(res.status).toBe(502);
  });
});

// Restore original fetch after all tests
afterAll(() => {
  globalThis.fetch = originalFetch;
});
