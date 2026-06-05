import { describe, it, expect } from "vitest";
import { isLowQualityItem, sourceKey, sanitizeSummary } from "./content-quality";

describe("isLowQualityItem — junk sources", () => {
  it("drops SEO/AI content-farm sources surfaced in QA", () => {
    expect(isLowQualityItem("Best 3D CGI Animation Software: 2026 Comparison", "gitnux.org", "https://gitnux.org/x")).toBe(true);
    expect(isLowQualityItem("Cloud DevOps Services: Ultimate 2026 Guide", "gitnexa.com", "")).toBe(true);
    expect(isLowQualityItem("Mastering Motion", "mag.venezart.com", "")).toBe(true);
    expect(isLowQualityItem("Top Series A VC Firms", "thefounders.group", "")).toBe(true);
    expect(isLowQualityItem("Orbital Industries raises $50M", "newsbeep.com", "")).toBe(true);
  });
  it("keeps reputable sources", () => {
    expect(isLowQualityItem("NASA's MAVEN went out with a whisper", "Ars Technica", "https://arstechnica.com/x")).toBe(false);
    expect(isLowQualityItem("SpaceX revenue surge", "24/7 Wall St.", "")).toBe(false); // borderline-legit, NOT junk
    expect(isLowQualityItem("Helm Chart guide", "DEV Community", "https://dev.to/x")).toBe(false);
  });
});

describe("isLowQualityItem — crypto recovery scams", () => {
  it("drops recovery-scam posts", () => {
    expect(isLowQualityItem("HOW TO RECOVER BITCOIN BACK FROM SCAMMERS", "medium.com", "")).toBe(true);
    expect(isLowQualityItem("Recover your lost crypto from hackers — guaranteed", "medium.com", "")).toBe(true);
    expect(isLowQualityItem("Crypto recovery expert helps victims reclaim funds", "medium.com", "")).toBe(true);
    expect(isLowQualityItem("Hire a hacker to get your money back", "medium.com", "")).toBe(true);
  });
  it("does NOT filter legitimate crypto/security news", () => {
    expect(isLowQualityItem("SEC recovers $2M in crypto fraud case", "Reuters", "")).toBe(false);
    expect(isLowQualityItem("Police recover stolen bitcoin worth $1M", "BBC", "")).toBe(false);
    expect(isLowQualityItem("How to recover deleted files on Windows", "How-To Geek", "")).toBe(false);
    expect(isLowQualityItem("Solana bulls defend a critical zone", "CoinDesk", "")).toBe(false);
  });
});

describe("sourceKey — collapse subdomains for diversity", () => {
  it("maps all Medium subdomains to one key", () => {
    expect(sourceKey("medium.com")).toBe("medium");
    expect(sourceKey("weglow.medium.com")).toBe("medium");
    expect(sourceKey("cryptotaxaudit.medium.com")).toBe("medium");
  });
  it("collapses common platforms", () => {
    expect(sourceKey("DEV Community")).toBe("devto");
    expect(sourceKey("dev.to")).toBe("devto");
    expect(sourceKey("r/space")).toBe("reddit");
  });
  it("uses registrable domain otherwise", () => {
    expect(sourceKey("Ars Technica")).not.toBe(sourceKey("BBC"));
    expect(sourceKey("phys.org")).toBe("phys.org");
  });
});

describe("sanitizeSummary — strip classifier meta", () => {
  it("removes the trailing feed-match rationale (the live bug)", () => {
    const leaked = "This article highlights the significance of understanding menstrual cycles and their impact on health, fitting well with the feed dedicated to health research.";
    const out = sanitizeSummary(leaked);
    expect(out).not.toMatch(/fitting well|the feed|dedicated to/i);
    expect(out).toMatch(/^This article highlights/);
  });
  it("leaves normal summaries intact", () => {
    const ok = "NASA's MAVEN spacecraft concluded its mission after 11 years at Mars.";
    expect(sanitizeSummary(ok)).toBe(ok);
  });
  it("handles empty / undefined", () => {
    expect(sanitizeSummary("")).toBe("");
    expect(sanitizeSummary(undefined)).toBe("");
  });
});
