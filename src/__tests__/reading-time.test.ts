import { describe, it, expect } from "vitest";
import { readingTime } from "@/lib/utils";

describe("readingTime (edge cases)", () => {
  it("handles text with multiple spaces", () => {
    expect(readingTime("word   word   word")).toBe("1 min read");
  });

  it("handles text with newlines", () => {
    expect(readingTime("word\nword\nword")).toBe("1 min read");
  });

  it("handles text with tabs", () => {
    expect(readingTime("word\tword\tword")).toBe("1 min read");
  });

  it("handles exactly 600 words (3 min)", () => {
    const text = Array(600).fill("word").join(" ");
    expect(readingTime(text)).toBe("3 min read");
  });

  it("handles 1000 words (5 min)", () => {
    const text = Array(1000).fill("word").join(" ");
    expect(readingTime(text)).toBe("5 min read");
  });

  it("handles very long text", () => {
    const text = Array(10000).fill("word").join(" ");
    expect(readingTime(text)).toBe("50 min read");
  });

  it("handles single character", () => {
    expect(readingTime("a")).toBe("1 min read");
  });
});
