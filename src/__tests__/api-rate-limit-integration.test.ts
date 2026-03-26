import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/feed/generate/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/feed/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `test-${Date.now()}-${Math.random()}`,
    },
    body: JSON.stringify(body),
  });
}

describe("API rate limiting integration", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    // Use a unique IP for this test to avoid interfering with others
    const ip = `rate-test-${Date.now()}`;
    const makeReqWithIp = (body: unknown) => new Request("http://localhost/api/feed/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
      },
      body: JSON.stringify(body),
    });

    // Send 20 requests (the limit)
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeReqWithIp({ prompt: "test" }));
      expect(res.status).toBe(200);
    }

    // 21st request should be rate limited
    const limitedRes = await POST(makeReqWithIp({ prompt: "test" }));
    expect(limitedRes.status).toBe(429);

    const json = await limitedRes.json();
    expect(json.error).toContain("Too many");
  });
});
