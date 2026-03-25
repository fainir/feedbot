import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.timestamp).toBeTruthy();
    expect(typeof json.timestamp).toBe("string");
  });

  it("returns valid ISO timestamp", async () => {
    const response = await GET();
    const json = await response.json();

    const date = new Date(json.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });
});
