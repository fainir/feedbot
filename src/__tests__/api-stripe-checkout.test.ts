import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock state ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockProfile: { id: string; email: string; stripe_customer_id: string | null } | null = {
  id: "user-123",
  email: "user@test.com",
  stripe_customer_id: "cus_existing",
};
let mockProfileError: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser } })),
    },
  })),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(async () => ({
            data: mockProfile,
            error: mockProfileError,
          })),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  })),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: vi.fn(async () => ({ id: "cus_new_123" })),
    },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://checkout.stripe.com/session_test" })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://billing.stripe.com/portal_test" })),
      },
    },
  },
  PLANS: {
    pro: { priceId: "price_pro_test" },
  },
}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

const checkoutModule = await import("@/app/api/stripe/checkout/route");
const portalModule = await import("@/app/api/stripe/portal/route");

function makeRequest() {
  return new NextRequest("http://localhost/api/stripe/checkout", { method: "POST" });
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockProfile = { id: "user-123", email: "user@test.com", stripe_customer_id: "cus_existing" };
    mockProfileError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await checkoutModule.POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 404 when profile not found", async () => {
    mockProfile = null;
    mockProfileError = { message: "not found" };
    const res = await checkoutModule.POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns checkout URL for existing Stripe customer", async () => {
    const res = await checkoutModule.POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/session_test");
  });

  it("creates new Stripe customer if none exists", async () => {
    mockProfile = { id: "user-123", email: "user@test.com", stripe_customer_id: null };
    const res = await checkoutModule.POST(makeRequest());
    expect(res.status).toBe(200);
    const { stripe } = await import("@/lib/stripe");
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@test.com" })
    );
  });
});

describe("POST /api/stripe/portal", () => {
  beforeEach(() => {
    mockUser = { id: "user-123" };
    mockProfile = { id: "user-123", email: "user@test.com", stripe_customer_id: "cus_existing" };
    mockProfileError = null;
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockUser = null;
    const res = await portalModule.POST(
      new NextRequest("http://localhost/api/stripe/portal", { method: "POST" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when no billing account", async () => {
    mockProfile = { id: "user-123", email: "user@test.com", stripe_customer_id: null };
    const res = await portalModule.POST(
      new NextRequest("http://localhost/api/stripe/portal", { method: "POST" })
    );
    expect(res.status).toBe(404);
  });

  it("returns billing portal URL", async () => {
    const res = await portalModule.POST(
      new NextRequest("http://localhost/api/stripe/portal", { method: "POST" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://billing.stripe.com/portal_test");
  });
});
