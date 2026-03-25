import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase service client
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}));

// Import after mocking
const { POST } = await import("@/app/api/waitlist/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid email", async () => {
    const res = await POST(makeRequest({ email: "test@example.com" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("rejects missing email", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rejects non-string email", async () => {
    const res = await POST(makeRequest({ email: 123 }));
    expect(res.status).toBe(400);
  });
});
