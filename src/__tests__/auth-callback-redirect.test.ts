import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

let mockExchangeError: unknown = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: mockExchangeError })),
    },
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

const { GET } = await import("@/app/auth/callback/route");

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/auth/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    mockExchangeError = null;
    vi.clearAllMocks();
  });

  // --- Open Redirect Prevention ---

  it("redirects to /dashboard by default", async () => {
    const res = await GET(makeRequest({ code: "valid-code" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("allows valid relative next path", async () => {
    const res = await GET(makeRequest({ code: "valid-code", next: "/dashboard/settings" }));
    expect(res.headers.get("location")).toContain("/dashboard/settings");
  });

  it("blocks protocol-relative URL (//evil.com)", async () => {
    const res = await GET(makeRequest({ code: "valid-code", next: "//evil.com" }));
    const location = res.headers.get("location") || "";
    expect(location).not.toContain("evil.com");
    expect(location).toContain("/dashboard");
  });

  it("blocks absolute URL (https://evil.com)", async () => {
    const res = await GET(makeRequest({ code: "valid-code", next: "https://evil.com" }));
    const location = res.headers.get("location") || "";
    expect(location).not.toContain("evil.com");
    expect(location).toContain("/dashboard");
  });

  it("blocks URL with embedded protocol (path://evil.com)", async () => {
    const res = await GET(makeRequest({ code: "valid-code", next: "/foo://evil.com" }));
    const location = res.headers.get("location") || "";
    expect(location).not.toContain("evil.com");
    expect(location).toContain("/dashboard");
  });

  it("blocks javascript: URI in next param", async () => {
    const res = await GET(makeRequest({ code: "valid-code", next: "javascript:alert(1)" }));
    const location = res.headers.get("location") || "";
    expect(location).not.toContain("javascript");
    expect(location).toContain("/dashboard");
  });

  // --- Auth Flow ---

  it("redirects to /login?error=auth when no code provided", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=auth");
  });

  it("redirects to /login?error=auth when exchange fails", async () => {
    mockExchangeError = { message: "invalid code" };
    const res = await GET(makeRequest({ code: "invalid-code" }));
    expect(res.headers.get("location")).toContain("/login?error=auth");
  });
});
