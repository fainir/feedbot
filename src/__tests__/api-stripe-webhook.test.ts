import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({
    from: (table: string) => {
      if (table === "subscriptions") {
        return { upsert: mockUpsert, update: mockUpdate };
      }
      if (table === "profiles") {
        return { update: mockUpdate };
      }
      return { upsert: mockUpsert, update: mockUpdate };
    },
  }),
}));

const mockConstructEvent = vi.fn();
const mockRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
    subscriptions: {
      retrieve: (...args: unknown[]) => mockRetrieve(...args),
    },
  },
}));

const { POST } = await import("@/app/api/stripe/webhook/route");

// --- Helpers ---

function makeWebhookRequest(
  body: string,
  signature: string | null = "sig_test_123"
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature) headers["stripe-signature"] = signature;
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  });
}

function makeCheckoutEvent(userId: string, subscriptionId: string) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: { user_id: userId },
        subscription: subscriptionId,
      },
    },
  };
}

function makeSubscriptionUpdateEvent(
  userId: string,
  subscriptionId: string,
  status: string = "active"
) {
  return {
    type: "customer.subscription.updated",
    data: {
      object: {
        id: subscriptionId,
        metadata: { user_id: userId },
        status,
        items: {
          data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 }],
        },
      },
    },
  };
}

function makeSubscriptionDeletedEvent(
  userId: string,
  subscriptionId: string
) {
  return {
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: subscriptionId,
        metadata: { user_id: userId },
      },
    },
  };
}

function makePaymentFailedEvent(subscriptionId: string) {
  return {
    type: "invoice.payment_failed",
    data: {
      object: {
        parent: {
          subscription_details: {
            subscription: subscriptionId,
          },
        },
      },
    },
  };
}

// --- Tests ---

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth & Signature ---

  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeWebhookRequest("{}", null) as never);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing stripe-signature header");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeWebhookRequest("{}") as never);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid signature");
  });

  // --- checkout.session.completed ---

  it("handles checkout.session.completed — creates subscription", async () => {
    const event = makeCheckoutEvent("user-123", "sub_test_456");
    mockConstructEvent.mockReturnValue(event);
    mockRetrieve.mockResolvedValue({
      items: {
        data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }],
      },
    });

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
    expect(mockRetrieve).toHaveBeenCalledWith("sub_test_456");
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("skips checkout.session.completed with missing user_id", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {},
          subscription: "sub_test_789",
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  // --- customer.subscription.updated ---

  it("handles subscription.updated — updates to active pro", async () => {
    const event = makeSubscriptionUpdateEvent("user-123", "sub_test_456", "active");
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("handles subscription.updated with canceled status — downgrades to free", async () => {
    const event = makeSubscriptionUpdateEvent("user-123", "sub_test_456", "canceled");
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
  });

  it("skips subscription.updated with missing user_id", async () => {
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          metadata: {},
          status: "active",
          items: { data: [{ current_period_end: 999999999 }] },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
  });

  // --- customer.subscription.deleted ---

  it("handles subscription.deleted — cancels and downgrades", async () => {
    const event = makeSubscriptionDeletedEvent("user-123", "sub_test_456");
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips subscription.deleted with missing user_id", async () => {
    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          metadata: {},
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
  });

  // --- invoice.payment_failed ---

  it("handles invoice.payment_failed — marks past_due", async () => {
    const event = makePaymentFailedEvent("sub_test_456");
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips payment_failed with missing subscription", async () => {
    const event = {
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: null,
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeWebhookRequest(JSON.stringify(event)) as never);
    expect(res.status).toBe(200);
  });

  // --- Unknown event ---

  it("returns 200 for unknown event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "some.unknown.event",
      data: { object: {} },
    });

    const res = await POST(makeWebhookRequest("{}") as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
  });

  // --- Error handling ---

  it("handles non-Error thrown during signature verification", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw "string error";
    });

    const res = await POST(makeWebhookRequest("{}") as never);
    expect(res.status).toBe(400);
  });
});
