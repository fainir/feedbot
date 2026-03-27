import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { FeedCard } from "@/components/feed/feed-card";
import { QuickShareMenu } from "@/components/feed/quick-share";

// Mock child components that aren't relevant to a11y tests
vi.mock("@/components/feed/trending-tab", () => ({
  TrendingBadge: () => null,
}));
vi.mock("@/components/feed/sentiment-badge", () => ({
  SentimentBadge: () => null,
}));
vi.mock("@/components/feed/content-type-tag", () => ({
  ContentTypeTag: () => null,
}));
vi.mock("@/components/feed/quick-share", () => ({
  QuickShareMenu: ({ title, url }: { title: string; url: string }) => (
    <button aria-label={`Share "${title}"`}>Share</button>
  ),
}));

const defaultProps = {
  title: "Test Article Title",
  summary: "A brief summary of the article content.",
  source: "TechNews",
  url: "https://example.com/article",
  publishedAt: new Date().toISOString(),
};

describe("FeedCard accessibility", () => {
  it("renders with role=article and aria-label", () => {
    render(<FeedCard {...defaultProps} />);
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("aria-label", "Test Article Title");
  });

  it("reader button has descriptive aria-label", () => {
    const onOpenReader = vi.fn();
    render(<FeedCard {...defaultProps} onOpenReader={onOpenReader} />);
    const btn = screen.getByLabelText('Read "Test Article Title" inline');
    expect(btn).toBeTruthy();
  });

  it("bookmark button has aria-label and aria-pressed", () => {
    const onToggle = vi.fn();
    render(
      <FeedCard {...defaultProps} onToggleBookmark={onToggle} bookmarked={false} />
    );
    const btn = screen.getByLabelText('Bookmark "Test Article Title"');
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("bookmark button reflects pressed state when bookmarked", () => {
    const onToggle = vi.fn();
    render(
      <FeedCard {...defaultProps} onToggleBookmark={onToggle} bookmarked={true} />
    );
    const btn = screen.getByLabelText(
      'Remove bookmark from "Test Article Title"'
    );
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("pin button has aria-label and aria-pressed", () => {
    const onTogglePin = vi.fn();
    render(
      <FeedCard {...defaultProps} onTogglePin={onTogglePin} pinned={false} />
    );
    const btn = screen.getByLabelText('Pin "Test Article Title" to top');
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("pin button reflects pressed state when pinned", () => {
    const onTogglePin = vi.fn();
    render(
      <FeedCard {...defaultProps} onTogglePin={onTogglePin} pinned={true} />
    );
    const btn = screen.getByLabelText('Unpin "Test Article Title"');
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("similar articles button has aria-label", () => {
    const onFindSimilar = vi.fn();
    render(
      <FeedCard {...defaultProps} onFindSimilar={onFindSimilar} />
    );
    const btn = screen.getByLabelText(
      'Find articles similar to "Test Article Title"'
    );
    expect(btn).toBeTruthy();
  });

  it("note button has aria-label and aria-expanded", () => {
    const onSaveNote = vi.fn();
    render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
    const btn = screen.getByLabelText('Add note to "Test Article Title"');
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("note button shows edit label when note exists", () => {
    const onSaveNote = vi.fn();
    render(
      <FeedCard {...defaultProps} onSaveNote={onSaveNote} note="My note" />
    );
    const btn = screen.getByLabelText(
      'Edit note on "Test Article Title"'
    );
    expect(btn).toBeTruthy();
  });
});
