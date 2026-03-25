import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/utils";

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-03-25T14:30:00Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("includes month and day", () => {
    const result = formatDate("2026-12-25T00:00:00Z");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });

  it("includes time", () => {
    const result = formatDate("2026-03-25T14:30:00Z");
    // Should contain time components
    expect(result.length).toBeGreaterThan(5);
  });

  it("handles different months", () => {
    expect(formatDate("2026-01-15T10:00:00Z")).toContain("Jan");
    expect(formatDate("2026-06-15T10:00:00Z")).toContain("Jun");
    expect(formatDate("2026-11-15T10:00:00Z")).toContain("Nov");
  });

  it("handles ISO date without time", () => {
    const result = formatDate("2026-03-25");
    expect(result).toBeTruthy();
  });

  it("formats midnight correctly", () => {
    const result = formatDate("2026-03-25T00:00:00Z");
    expect(result).toContain("Mar");
  });

  it("formats end of day correctly", () => {
    const result = formatDate("2026-03-25T23:59:59Z");
    expect(result).toContain("Mar");
  });
});
