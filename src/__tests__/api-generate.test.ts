import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/feed/generate/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/feed/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feed/generate", () => {
  it("returns items for valid AI prompt", async () => {
    const res = await POST(makeRequest({ prompt: "AI and machine learning" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items).toBeInstanceOf(Array);
    expect(json.items.length).toBeGreaterThan(0);
    expect(json.generatedAt).toBeTruthy();
  });

  it("returns items for startup prompt", async () => {
    const res = await POST(makeRequest({ prompt: "startup funding" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items.length).toBeGreaterThan(0);
  });

  it("returns generic items for unknown topic", async () => {
    const res = await POST(makeRequest({ prompt: "obscure niche topic xyz" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items.length).toBeGreaterThan(0);
  });

  it("rejects missing prompt", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects non-string prompt", async () => {
    const res = await POST(makeRequest({ prompt: 123 }));
    expect(res.status).toBe(400);
  });

  it("items have required fields", async () => {
    const res = await POST(makeRequest({ prompt: "technology news" }));
    const json = await res.json();
    for (const item of json.items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.summary).toBeTruthy();
      expect(item.url).toBeTruthy();
      expect(item.publishedAt).toBeTruthy();
    }
  });

  it("trims whitespace from prompt", async () => {
    const res = await POST(makeRequest({ prompt: "  AI news  " }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items.length).toBeGreaterThan(0);
  });
});
