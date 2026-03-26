import { describe, it, expect } from "vitest";

// Test the XML escaping logic from the export route
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

describe("escapeXml", () => {
  it("escapes all XML special characters", () => {
    expect(escapeXml('<tag attr="val">a & b\'s</tag>')).toBe(
      "&lt;tag attr=&quot;val&quot;&gt;a &amp; b&apos;s&lt;/tag&gt;"
    );
  });

  it("preserves normal text", () => {
    expect(escapeXml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles empty string", () => {
    expect(escapeXml("")).toBe("");
  });

  it("escapes URLs with ampersands", () => {
    expect(escapeXml("https://example.com?a=1&b=2")).toBe(
      "https://example.com?a=1&amp;b=2"
    );
  });
});
