import { describe, it, expect } from "vitest";
import { summarizeItem } from "@/lib/feed-engine";

describe("summarizeItem (advanced cases)", () => {
  it("handles content with only whitespace", () => {
    expect(summarizeItem("Title Here", "   \n\t   ")).toBe("Title Here");
  });

  it("handles mixed HTML and text", () => {
    const html = "<p>Start</p><ul><li>Item 1</li><li>Item 2</li></ul><p>End</p>";
    const result = summarizeItem("Title", html);
    expect(result).toContain("Start");
    expect(result).toContain("Item 1");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<li>");
  });

  it("truncates long content with ellipsis", () => {
    const text = "word ".repeat(50); // 250 chars
    const result = summarizeItem("Title", text);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("handles content exactly 200 chars", () => {
    const text = "a".repeat(200);
    const result = summarizeItem("Title", text);
    expect(result).toBe(text);
  });

  it("handles content 201 chars", () => {
    const text = "a".repeat(201);
    const result = summarizeItem("Title", text);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).toMatch(/\.\.\.$/);
  });

  it("preserves unicode characters", () => {
    const text = "日本語テスト content with émojis 🎉";
    expect(summarizeItem("Title", text)).toBe(text);
  });
});
