import { describe, it, expect } from "vitest";
import { summarizeItem } from "@/lib/feed-engine";

describe("summarizeItem", () => {
  it("returns short content as-is", () => {
    expect(summarizeItem("Title", "Short summary")).toBe("Short summary");
  });

  it("returns title when content is empty", () => {
    expect(summarizeItem("My Article Title", "")).toBe("My Article Title");
  });

  it("truncates long content at word boundary", () => {
    const longText = "This is a test sentence that keeps repeating. ".repeat(10);
    const result = summarizeItem("Title", longText);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).toMatch(/\.\.\.$/);
  });

  it("strips HTML tags from content", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(summarizeItem("Title", html)).toBe("Hello world");
  });

  it("handles content with only HTML tags", () => {
    const html = "<div><br/></div>";
    const result = summarizeItem("My Title", html);
    expect(result).toBe("My Title");
  });

  it("preserves content under 200 chars", () => {
    const text = "A reasonable length summary that fits within the limit.";
    expect(summarizeItem("Title", text)).toBe(text);
  });
});
