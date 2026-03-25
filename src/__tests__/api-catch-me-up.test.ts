import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/feed/catch-me-up/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/feed/catch-me-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feed/catch-me-up", () => {
  it("generates digest from items", async () => {
    const items = [
      { title: "AI breakthrough", source: "TechCrunch" },
      { title: "New startup raises $10M", source: "TechCrunch" },
      { title: "Open source AI model", source: "Hacker News" },
    ];
    const res = await POST(makeRequest({ items }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.digest).toBeTruthy();
    expect(json.digest).toContain("3 unread");
  });

  it("groups by source", async () => {
    const items = [
      { title: "Article 1", source: "SourceA" },
      { title: "Article 2", source: "SourceA" },
      { title: "Article 3", source: "SourceB" },
    ];
    const res = await POST(makeRequest({ items }));
    const json = await res.json();
    expect(json.digest).toContain("**SourceA**");
    expect(json.digest).toContain("**SourceB**");
  });

  it("detects trending keywords", async () => {
    const items = [
      { title: "Python framework released" },
      { title: "New Python library" },
      { title: "Python tutorial" },
    ];
    const res = await POST(makeRequest({ items }));
    const json = await res.json();
    expect(json.digest).toContain("python");
  });

  it("rejects empty items", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects missing items", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
