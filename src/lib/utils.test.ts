import { describe, it, expect } from "vitest";
import { normalizeFeedText } from "./utils";

describe("normalizeFeedText", () => {
  it("trims surrounding whitespace (the trailing-space dupe bug)", () => {
    expect(normalizeFeedText("חייזרים ")).toBe("חייזרים");
    expect(normalizeFeedText("  Esports  ")).toBe("Esports");
  });

  it("strips leading/embedded newlines (the '\\nDrum covers' dupe bug)", () => {
    expect(normalizeFeedText("\nDrum covers")).toBe("Drum covers");
    expect(normalizeFeedText("Drum\ncovers")).toBe("Drum covers");
  });

  it("collapses internal whitespace runs to single spaces", () => {
    expect(normalizeFeedText("AI    research   papers")).toBe("AI research papers");
    expect(normalizeFeedText("a\t\tb")).toBe("a b");
  });

  it("regression: whitespace variants normalize to the SAME value (no dupes)", () => {
    expect(normalizeFeedText("\nDrum covers")).toBe(normalizeFeedText("Drum covers"));
    expect(normalizeFeedText("חייזרים ")).toBe(normalizeFeedText("חייזרים"));
  });

  it("returns empty string for whitespace-only or non-string input", () => {
    expect(normalizeFeedText("   ")).toBe("");
    expect(normalizeFeedText("\n\t ")).toBe("");
    expect(normalizeFeedText(undefined)).toBe("");
    expect(normalizeFeedText(null)).toBe("");
    expect(normalizeFeedText(42)).toBe("");
  });

  it("leaves already-clean text unchanged", () => {
    expect(normalizeFeedText("Personal Finance")).toBe("Personal Finance");
  });
});
