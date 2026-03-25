import { describe, it, expect } from "vitest";
import { getContentType } from "@/components/feed/content-type-tag";

describe("getContentType", () => {
  it("detects news articles", () => {
    expect(getContentType("Company announces new product launch", "The company announced today...")).toBe("news");
  });

  it("detects tutorials", () => {
    expect(getContentType("How to build a REST API with Node.js", "A step-by-step guide for beginners getting started with building APIs")).toBe("tutorial");
  });

  it("detects opinion pieces", () => {
    expect(getContentType("Why I think React is overrated", "My take on why we should consider better alternatives")).toBe("opinion");
  });

  it("detects analysis content", () => {
    expect(getContentType("Deep dive: State of JavaScript 2026", "Our analysis shows trends in the survey data and benchmark comparison")).toBe("analysis");
  });

  it("defaults to news for ambiguous content", () => {
    expect(getContentType("Random title", "Some generic text")).toBe("news");
  });

  it("handles empty strings", () => {
    expect(getContentType("", "")).toBe("news");
  });

  it("is case insensitive", () => {
    expect(getContentType("HOW TO GET STARTED", "A TUTORIAL FOR BEGINNERS GUIDE")).toBe("tutorial");
  });
});
