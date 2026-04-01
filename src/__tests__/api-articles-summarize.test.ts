import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock state ---

let mockRateLimitSuccess = true;

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: mockRateLimitSuccess, limit: 15, remaining: 14, resetAt: Date.now() + 60000 })),
  getClientKey: vi.fn(() => "127.0.0.1"),
}));

const { POST } = await import("@/app/api/articles/summarize/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/articles/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/articles/summarize", () => {
  beforeEach(() => {
    mockRateLimitSuccess = true;
    vi.clearAllMocks();
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitSuccess = false;
    const res = await POST(makeRequest({ title: "Test", url: "https://example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeRequest({ url: "https://example.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Title is required");
  });

  it("returns summary with all expected fields", async () => {
    const res = await POST(makeRequest({
      title: "AI Breakthrough Leads to Growth in Tech Industry",
      url: "https://techcrunch.com/article",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("summary");
    expect(body).toHaveProperty("keyTakeaways");
    expect(body).toHaveProperty("sentiment");
    expect(body).toHaveProperty("readingTime");
    expect(Array.isArray(body.keyTakeaways)).toBe(true);
    expect(body.keyTakeaways.length).toBeGreaterThanOrEqual(3);
    expect(["positive", "neutral", "negative"]).toContain(body.sentiment);
    expect(body.readingTime).toMatch(/\d+ min read/);
  });

  it("detects positive sentiment", async () => {
    const res = await POST(makeRequest({
      title: "Major Growth Surge and Breakthrough Success Win",
      url: "https://example.com",
    }));
    const body = await res.json();
    expect(body.sentiment).toBe("positive");
  });

  it("detects negative sentiment", async () => {
    const res = await POST(makeRequest({
      title: "Market Crash and Decline Lead to Crisis and Loss",
      url: "https://example.com",
    }));
    const body = await res.json();
    expect(body.sentiment).toBe("negative");
  });

  it("handles missing URL gracefully", async () => {
    const res = await POST(makeRequest({ title: "Some Article" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeDefined();
  });

  it("returns 500 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/articles/summarize", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
