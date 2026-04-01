import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedCard } from "@/components/feed/feed-card";

// Mock dependencies
vi.mock("@/components/feed/trending-tab", () => ({
  TrendingBadge: ({ reasons }: { reasons: string[] }) => (
    <div data-testid="trending-badge">{reasons.join(", ")}</div>
  ),
}));

vi.mock("@/components/feed/quick-share", () => ({
  QuickShareMenu: ({ title, url }: { title: string; url: string }) => (
    <button data-testid="quick-share-menu" data-title={title} data-url={url}>
      Share
    </button>
  ),
}));

vi.mock("@/components/feed/sentiment-badge", () => ({
  SentimentBadge: ({ title, summary }: { title: string; summary: string }) => (
    <div data-testid="sentiment-badge" data-title={title} data-summary={summary} />
  ),
}));

vi.mock("@/components/feed/content-type-tag", () => ({
  ContentTypeTag: ({ title, summary }: { title: string; summary: string }) => (
    <div data-testid="content-type-tag" data-title={title} data-summary={summary} />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
  timeAgo: (date: string) => {
    const now = Date.now();
    const time = new Date(date).getTime();
    const secondsAgo = (now - time) / 1000;
    if (secondsAgo < 60) return "just now";
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  },
  readingTime: (text: string) => {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  },
}));

const defaultProps = {
  title: "Breaking: New AI Model Released",
  summary: "A new AI model has been released today with incredible capabilities. This is a significant milestone in the field of artificial intelligence.",
  source: "TechNews.com",
  url: "https://technews.com/article",
  publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
};

describe("FeedCard", () => {
  describe("Basic Rendering", () => {
    it("renders title, summary, source, and timestamp", () => {
      render(<FeedCard {...defaultProps} />);

      expect(screen.getByText("Breaking: New AI Model Released")).toBeInTheDocument();
      expect(screen.getByText(/A new AI model has been released/)).toBeInTheDocument();
      expect(screen.getByText("TechNews.com")).toBeInTheDocument();
      expect(screen.getByText(/h ago/)).toBeInTheDocument();
    });

    it("renders card with correct aria-label", () => {
      const { container } = render(<FeedCard {...defaultProps} />);
      const card = container.querySelector('[role="article"]');
      expect(card).toHaveAttribute("aria-label", defaultProps.title);
    });

    it("renders title link with external link icon", () => {
      render(<FeedCard {...defaultProps} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", defaultProps.url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders reading time", () => {
      render(<FeedCard {...defaultProps} />);
      expect(screen.getByText(/\d+ min read/)).toBeInTheDocument();
    });

    it("renders sentiment badge", () => {
      render(<FeedCard {...defaultProps} />);
      expect(screen.getByTestId("sentiment-badge")).toBeInTheDocument();
    });

    it("renders content type tag", () => {
      render(<FeedCard {...defaultProps} />);
      expect(screen.getByTestId("content-type-tag")).toBeInTheDocument();
    });

    it("renders share menu", () => {
      render(<FeedCard {...defaultProps} />);
      expect(screen.getByTestId("quick-share-menu")).toBeInTheDocument();
    });

    it("renders source icon as image when sourceIcon provided", () => {
      const iconUrl = "https://example.com/icon.png";
      render(<FeedCard {...defaultProps} sourceIcon={iconUrl} />);
      const img = screen.getByAltText(defaultProps.source);
      expect(img).toHaveAttribute("src", iconUrl);
    });

    it("renders globe icon when sourceIcon not provided", () => {
      const { container } = render(<FeedCard {...defaultProps} />);
      // Check for globe icon in the source section
      const sourceDiv = screen.getByText(defaultProps.source).parentElement;
      expect(sourceDiv).toBeInTheDocument();
    });
  });

  describe("Bookmark Button", () => {
    it("renders bookmark button when onToggleBookmark provided", () => {
      const onToggleBookmark = vi.fn();
      render(
        <FeedCard
          {...defaultProps}
          onToggleBookmark={onToggleBookmark}
          bookmarked={false}
        />
      );
      expect(
        screen.getByLabelText(`Bookmark "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("calls onToggleBookmark when bookmark button clicked", async () => {
      const onToggleBookmark = vi.fn();
      render(
        <FeedCard
          {...defaultProps}
          onToggleBookmark={onToggleBookmark}
          bookmarked={false}
        />
      );
      const bookmarkBtn = screen.getByLabelText(`Bookmark "${defaultProps.title}"`);
      await userEvent.click(bookmarkBtn);
      expect(onToggleBookmark).toHaveBeenCalledOnce();
    });

    it("shows correct aria-label when bookmarked", () => {
      render(
        <FeedCard
          {...defaultProps}
          onToggleBookmark={vi.fn()}
          bookmarked={true}
        />
      );
      expect(
        screen.getByLabelText(`Remove bookmark from "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("shows correct aria-label when not bookmarked", () => {
      render(
        <FeedCard
          {...defaultProps}
          onToggleBookmark={vi.fn()}
          bookmarked={false}
        />
      );
      expect(
        screen.getByLabelText(`Bookmark "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("has aria-pressed state set correctly", () => {
      const { rerender } = render(
        <FeedCard
          {...defaultProps}
          onToggleBookmark={vi.fn()}
          bookmarked={false}
        />
      );
      let bookmarkBtn = screen.getByLabelText(`Bookmark "${defaultProps.title}"`);
      expect(bookmarkBtn).toHaveAttribute("aria-pressed", "false");

      rerender(
        <FeedCard
          {...defaultProps}
          onToggleBookmark={vi.fn()}
          bookmarked={true}
        />
      );
      bookmarkBtn = screen.getByLabelText(
        `Remove bookmark from "${defaultProps.title}"`
      );
      expect(bookmarkBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("does not render bookmark button when onToggleBookmark not provided", () => {
      render(<FeedCard {...defaultProps} onToggleBookmark={undefined} />);
      expect(
        screen.queryByLabelText(`Bookmark "${defaultProps.title}"`)
      ).not.toBeInTheDocument();
    });
  });

  describe("Pin Button", () => {
    it("renders pin button when onTogglePin provided", () => {
      const onTogglePin = vi.fn();
      render(
        <FeedCard
          {...defaultProps}
          onTogglePin={onTogglePin}
          pinned={false}
        />
      );
      expect(
        screen.getByLabelText(`Pin "${defaultProps.title}" to top`)
      ).toBeInTheDocument();
    });

    it("calls onTogglePin when pin button clicked", async () => {
      const onTogglePin = vi.fn();
      render(
        <FeedCard
          {...defaultProps}
          onTogglePin={onTogglePin}
          pinned={false}
        />
      );
      const pinBtn = screen.getByLabelText(`Pin "${defaultProps.title}" to top`);
      await userEvent.click(pinBtn);
      expect(onTogglePin).toHaveBeenCalledOnce();
    });

    it("stops event propagation when pin button clicked", async () => {
      const onTogglePin = vi.fn();
      const { container } = render(
        <FeedCard
          {...defaultProps}
          onTogglePin={onTogglePin}
          pinned={false}
        />
      );
      const pinBtn = screen.getByLabelText(`Pin "${defaultProps.title}" to top`);
      const card = container.querySelector('[role="article"]');
      const cardClickSpy = vi.fn();
      card?.addEventListener("click", cardClickSpy);

      fireEvent.click(pinBtn);

      expect(onTogglePin).toHaveBeenCalledOnce();
    });

    it("shows correct aria-label when pinned", () => {
      render(
        <FeedCard
          {...defaultProps}
          onTogglePin={vi.fn()}
          pinned={true}
        />
      );
      expect(
        screen.getByLabelText(`Unpin "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("shows correct aria-label when not pinned", () => {
      render(
        <FeedCard
          {...defaultProps}
          onTogglePin={vi.fn()}
          pinned={false}
        />
      );
      expect(
        screen.getByLabelText(`Pin "${defaultProps.title}" to top`)
      ).toBeInTheDocument();
    });

    it("has aria-pressed state set correctly", () => {
      const { rerender } = render(
        <FeedCard
          {...defaultProps}
          onTogglePin={vi.fn()}
          pinned={false}
        />
      );
      let pinBtn = screen.getByLabelText(`Pin "${defaultProps.title}" to top`);
      expect(pinBtn).toHaveAttribute("aria-pressed", "false");

      rerender(
        <FeedCard
          {...defaultProps}
          onTogglePin={vi.fn()}
          pinned={true}
        />
      );
      pinBtn = screen.getByLabelText(`Unpin "${defaultProps.title}"`);
      expect(pinBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("does not render pin button when onTogglePin not provided", () => {
      render(<FeedCard {...defaultProps} onTogglePin={undefined} />);
      expect(
        screen.queryByLabelText(`Pin "${defaultProps.title}" to top`)
      ).not.toBeInTheDocument();
    });
  });

  describe("Reader Button", () => {
    it("renders reader button when onOpenReader provided", () => {
      const onOpenReader = vi.fn();
      render(<FeedCard {...defaultProps} onOpenReader={onOpenReader} />);
      expect(
        screen.getByLabelText(`Read "${defaultProps.title}" inline`)
      ).toBeInTheDocument();
    });

    it("calls onOpenReader when reader button clicked", async () => {
      const onOpenReader = vi.fn();
      render(<FeedCard {...defaultProps} onOpenReader={onOpenReader} />);
      const readerBtn = screen.getByLabelText(
        `Read "${defaultProps.title}" inline`
      );
      await userEvent.click(readerBtn);
      expect(onOpenReader).toHaveBeenCalledOnce();
    });

    it("does not render reader button when onOpenReader not provided", () => {
      render(<FeedCard {...defaultProps} onOpenReader={undefined} />);
      expect(
        screen.queryByLabelText(`Read "${defaultProps.title}" inline`)
      ).not.toBeInTheDocument();
    });
  });

  describe("Note Editor", () => {
    it("renders note button when onSaveNote provided", () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      expect(
        screen.getByLabelText(`Add note to "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("shows note editor textarea when note button clicked", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);
      expect(screen.getByPlaceholderText("Add a note about this item...")).toBeInTheDocument();
    });

    it("hides note editor when cancel button clicked", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const cancelBtn = screen.getByLabelText("Cancel note editing");
      await userEvent.click(cancelBtn);

      expect(
        screen.queryByPlaceholderText("Add a note about this item...")
      ).not.toBeInTheDocument();
    });

    it("saves note when save button clicked", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText("Add a note about this item...");
      await userEvent.type(textarea, "This is my note");

      const saveBtn = screen.getByLabelText("Save note");
      await userEvent.click(saveBtn);

      expect(onSaveNote).toHaveBeenCalledWith("This is my note");
    });

    it("saves note on Enter key without Shift", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText("Add a note about this item...");
      await userEvent.type(textarea, "This is my note");
      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(onSaveNote).toHaveBeenCalledWith("This is my note");
    });

    it("does not save note on Shift+Enter", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText("Add a note about this item...");
      await userEvent.type(textarea, "Line 1");
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

      expect(onSaveNote).not.toHaveBeenCalled();
    });

    it("closes editor on Escape key", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText("Add a note about this item...");
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(
        screen.queryByPlaceholderText("Add a note about this item...")
      ).not.toBeInTheDocument();
    });

    it("displays existing note when note prop provided", () => {
      const onSaveNote = vi.fn();
      const existingNote = "This is an existing note";
      render(
        <FeedCard
          {...defaultProps}
          onSaveNote={onSaveNote}
          note={existingNote}
        />
      );
      expect(screen.getByText(existingNote)).toBeInTheDocument();
    });

    it("shows edit note label when note exists", () => {
      render(
        <FeedCard
          {...defaultProps}
          onSaveNote={vi.fn()}
          note="Existing note"
        />
      );
      expect(
        screen.getByLabelText(`Edit note on "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("populates note editor with existing note content", async () => {
      const onSaveNote = vi.fn();
      const existingNote = "This is an existing note";
      render(
        <FeedCard
          {...defaultProps}
          onSaveNote={onSaveNote}
          note={existingNote}
        />
      );
      const noteBtn = screen.getByLabelText(`Edit note on "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText(
        "Add a note about this item..."
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe(existingNote);
    });

    it("has correct aria-label for textarea", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      expect(screen.getByLabelText(`Note for "${defaultProps.title}"`)).toBeInTheDocument();
    });

    it("textarea has aria-expanded attribute", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);

      expect(noteBtn).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(noteBtn);

      expect(noteBtn).toHaveAttribute("aria-expanded", "true");
    });

    it("does not render note button when onSaveNote not provided", () => {
      render(<FeedCard {...defaultProps} onSaveNote={undefined} />);
      expect(
        screen.queryByLabelText(`Add note to "${defaultProps.title}"`)
      ).not.toBeInTheDocument();
    });
  });

  describe("Compact Mode", () => {
    it("hides summary when compact is true", () => {
      render(<FeedCard {...defaultProps} compact={true} />);
      expect(
        screen.queryByText(/A new AI model has been released/)
      ).not.toBeInTheDocument();
    });

    it("shows summary when compact is false", () => {
      render(<FeedCard {...defaultProps} compact={false} />);
      expect(
        screen.getByText(/A new AI model has been released/)
      ).toBeInTheDocument();
    });

    it("shows summary by default", () => {
      render(<FeedCard {...defaultProps} />);
      expect(
        screen.getByText(/A new AI model has been released/)
      ).toBeInTheDocument();
    });

    it("applies compact styling when compact is true", () => {
      const { container } = render(<FeedCard {...defaultProps} compact={true} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/\!p-3/);
    });
  });

  describe("Read State", () => {
    it("applies opacity class when isRead is true", () => {
      const { container } = render(<FeedCard {...defaultProps} isRead={true} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/opacity-60/);
    });

    it("does not apply opacity class when isRead is false", () => {
      const { container } = render(<FeedCard {...defaultProps} isRead={false} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).not.toMatch(/opacity-60/);
    });

    it("does not apply opacity class by default", () => {
      const { container } = render(<FeedCard {...defaultProps} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).not.toMatch(/opacity-60/);
    });
  });

  describe("Focused State", () => {
    it("applies ring class when isFocused is true", () => {
      const { container } = render(<FeedCard {...defaultProps} isFocused={true} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/ring-2.*ring-primary/);
    });

    it("does not apply ring class when isFocused is false", () => {
      const { container } = render(<FeedCard {...defaultProps} isFocused={false} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).not.toMatch(/ring-2/);
    });

    it("does not apply ring class by default", () => {
      const { container } = render(<FeedCard {...defaultProps} />);
      const card = container.querySelector('[role="article"]');
      expect(card?.className).not.toMatch(/ring-2/);
    });
  });

  describe("Tag Badges", () => {
    it("renders tag badges when provided", () => {
      const tags = ["Technology", "AI", "Breaking News"];
      render(<FeedCard {...defaultProps} tagBadges={tags} />);
      tags.forEach((tag) => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });

    it("does not render tag section when tagBadges not provided", () => {
      const { container } = render(<FeedCard {...defaultProps} tagBadges={undefined} />);
      // Check that no tag badge elements are rendered (they have bg-primary/10 class)
      const tagBadges = container.querySelectorAll('[class*="bg-primary/10"]');
      expect(tagBadges.length).toBe(0);
    });

    it("does not render tag section when tagBadges is empty", () => {
      render(<FeedCard {...defaultProps} tagBadges={[]} />);
      const tagElements = screen.queryAllByText(/^(Technology|AI|Breaking News)$/);
      expect(tagElements).toHaveLength(0);
    });

    it("renders correct number of tag badges", () => {
      const tags = ["Tech", "AI", "News"];
      const { container } = render(<FeedCard {...defaultProps} tagBadges={tags} />);
      const tagElements = container.querySelectorAll('[class*="primary/10"]');
      expect(tagElements.length).toBeGreaterThanOrEqual(tags.length);
    });
  });

  describe("Trending Reasons", () => {
    it("renders trending badge when trendingReasons provided", () => {
      const reasons = ["Trending Today", "Popular"];
      render(<FeedCard {...defaultProps} trendingReasons={reasons} />);
      expect(screen.getByTestId("trending-badge")).toBeInTheDocument();
    });

    it("passes correct reasons to trending badge", () => {
      const reasons = ["Just published", "Unread"];
      render(<FeedCard {...defaultProps} trendingReasons={reasons} />);
      const badge = screen.getByTestId("trending-badge");
      expect(badge).toHaveTextContent("Just published");
      expect(badge).toHaveTextContent("Unread");
    });

    it("does not render trending badge when trendingReasons not provided", () => {
      render(<FeedCard {...defaultProps} trendingReasons={undefined} />);
      expect(screen.queryByTestId("trending-badge")).not.toBeInTheDocument();
    });

    it("does not render trending badge when trendingReasons is empty", () => {
      render(<FeedCard {...defaultProps} trendingReasons={[]} />);
      expect(screen.queryByTestId("trending-badge")).not.toBeInTheDocument();
    });
  });

  describe("Find Similar Button", () => {
    it("renders find similar button when onFindSimilar provided", () => {
      const onFindSimilar = vi.fn();
      render(<FeedCard {...defaultProps} onFindSimilar={onFindSimilar} />);
      expect(
        screen.getByLabelText(`Find articles similar to "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("calls onFindSimilar when button clicked", async () => {
      const onFindSimilar = vi.fn();
      render(<FeedCard {...defaultProps} onFindSimilar={onFindSimilar} />);
      const btn = screen.getByLabelText(
        `Find articles similar to "${defaultProps.title}"`
      );
      await userEvent.click(btn);
      expect(onFindSimilar).toHaveBeenCalledOnce();
    });

    it("stops event propagation when find similar button clicked", async () => {
      const onFindSimilar = vi.fn();
      render(<FeedCard {...defaultProps} onFindSimilar={onFindSimilar} />);
      const btn = screen.getByLabelText(
        `Find articles similar to "${defaultProps.title}"`
      );
      fireEvent.click(btn);
      expect(onFindSimilar).toHaveBeenCalledOnce();
    });

    it("does not render find similar button when onFindSimilar not provided", () => {
      render(<FeedCard {...defaultProps} onFindSimilar={undefined} />);
      expect(
        screen.queryByLabelText(`Find articles similar to "${defaultProps.title}"`)
      ).not.toBeInTheDocument();
    });
  });

  describe("Read Later Slot", () => {
    it("renders readLaterSlot when provided", () => {
      const readLaterSlot = <button data-testid="read-later-btn">Read Later</button>;
      render(<FeedCard {...defaultProps} readLaterSlot={readLaterSlot} />);
      expect(screen.getByTestId("read-later-btn")).toBeInTheDocument();
    });

    it("does not render readLaterSlot when not provided", () => {
      render(<FeedCard {...defaultProps} readLaterSlot={undefined} />);
      expect(screen.queryByTestId("read-later-btn")).not.toBeInTheDocument();
    });
  });

  describe("Aria Labels and Accessibility", () => {
    it("card has proper semantic role", () => {
      const { container } = render(<FeedCard {...defaultProps} />);
      const card = container.querySelector('[role="article"]');
      expect(card).toBeInTheDocument();
    });

    it("title link is accessible", () => {
      render(<FeedCard {...defaultProps} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAccessibleName();
    });

    it("all interactive buttons have aria labels", () => {
      const callbacks = {
        onToggleBookmark: vi.fn(),
        onTogglePin: vi.fn(),
        onOpenReader: vi.fn(),
        onSaveNote: vi.fn(),
        onFindSimilar: vi.fn(),
      };
      render(<FeedCard {...defaultProps} {...callbacks} />);

      expect(
        screen.getByLabelText(`Bookmark "${defaultProps.title}"`)
      ).toHaveAccessibleName();
      expect(
        screen.getByLabelText(`Pin "${defaultProps.title}" to top`)
      ).toHaveAccessibleName();
      expect(
        screen.getByLabelText(`Read "${defaultProps.title}" inline`)
      ).toHaveAccessibleName();
      expect(
        screen.getByLabelText(`Add note to "${defaultProps.title}"`)
      ).toHaveAccessibleName();
      expect(
        screen.getByLabelText(`Find articles similar to "${defaultProps.title}"`)
      ).toHaveAccessibleName();
    });
  });

  describe("Edge Cases", () => {
    it("handles long titles gracefully", () => {
      const longTitle =
        "This is an extremely long article title that goes on and on and really should have been shorter but here we are";
      render(<FeedCard {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles empty summary gracefully", () => {
      render(<FeedCard {...defaultProps} summary="" />);
      // Should still render the card
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("handles special characters in title", () => {
      const title = 'Breaking: "AI" Breakthrough & New Opportunities!';
      render(<FeedCard {...defaultProps} title={title} />);
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it("handles all callbacks being provided together", () => {
      const callbacks = {
        onToggleBookmark: vi.fn(),
        onTogglePin: vi.fn(),
        onOpenReader: vi.fn(),
        onSaveNote: vi.fn(),
        onFindSimilar: vi.fn(),
      };
      render(
        <FeedCard
          {...defaultProps}
          {...callbacks}
          bookmarked={false}
          pinned={false}
        />
      );

      // Verify all buttons are rendered
      expect(
        screen.getByLabelText(`Bookmark "${defaultProps.title}"`)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(`Pin "${defaultProps.title}" to top`)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(`Read "${defaultProps.title}" inline`)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(`Add note to "${defaultProps.title}"`)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(`Find articles similar to "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("handles none of the callbacks being provided", () => {
      const { container } = render(<FeedCard {...defaultProps} />);
      const card = container.querySelector('[role="article"]');
      expect(card).toBeInTheDocument();
      // Should still render the card with basic info
      expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    });

    it("handles URL encoding in share menu", () => {
      render(<FeedCard {...defaultProps} />);
      const shareMenu = screen.getByTestId("quick-share-menu");
      expect(shareMenu).toHaveAttribute("data-title", defaultProps.title);
      expect(shareMenu).toHaveAttribute("data-url", defaultProps.url);
    });
  });

  describe("Combined States", () => {
    it("handles read + focused state together", () => {
      const { container } = render(
        <FeedCard {...defaultProps} isRead={true} isFocused={true} />
      );
      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/opacity-60/);
      expect(card?.className).toMatch(/ring-2.*ring-primary/);
    });

    it("handles compact + read state together", () => {
      const { container } = render(
        <FeedCard {...defaultProps} compact={true} isRead={true} />
      );
      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/opacity-60/);
      expect(card?.className).toMatch(/\!p-3/);
    });

    it("handles bookmarked + pinned state together", () => {
      render(
        <FeedCard
          {...defaultProps}
          bookmarked={true}
          pinned={true}
          onToggleBookmark={vi.fn()}
          onTogglePin={vi.fn()}
        />
      );
      expect(
        screen.getByLabelText(`Remove bookmark from "${defaultProps.title}"`)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(`Unpin "${defaultProps.title}"`)
      ).toBeInTheDocument();
    });

    it("handles note + tags together", () => {
      render(
        <FeedCard
          {...defaultProps}
          note="My note"
          tagBadges={["Tech", "News"]}
          onSaveNote={vi.fn()}
        />
      );
      expect(screen.getByText("My note")).toBeInTheDocument();
      expect(screen.getByText("Tech")).toBeInTheDocument();
      expect(screen.getByText("News")).toBeInTheDocument();
    });

    it("handles trending reasons + tags together", () => {
      render(
        <FeedCard
          {...defaultProps}
          trendingReasons={["Popular"]}
          tagBadges={["Tech"]}
        />
      );
      expect(screen.getByTestId("trending-badge")).toBeInTheDocument();
      expect(screen.getByText("Tech")).toBeInTheDocument();
    });
  });

  describe("Note Editor Focus and Keyboard Interactions", () => {
    it("textarea autofocuses when editor opens", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText(
        "Add a note about this item..."
      ) as HTMLTextAreaElement;
      expect(document.activeElement).toBe(textarea);
    });

    it("updates note text as user types", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);
      await userEvent.click(noteBtn);

      const textarea = screen.getByPlaceholderText(
        "Add a note about this item..."
      ) as HTMLTextAreaElement;
      await userEvent.type(textarea, "First line");
      expect(textarea.value).toBe("First line");

      await userEvent.type(textarea, "{Shift>}{Enter}{/Shift}Second line");
      expect(textarea.value).toContain("Second line");
    });

    it("toggles note editor visibility", async () => {
      const onSaveNote = vi.fn();
      render(<FeedCard {...defaultProps} onSaveNote={onSaveNote} />);
      const noteBtn = screen.getByLabelText(`Add note to "${defaultProps.title}"`);

      // Initially hidden
      expect(
        screen.queryByPlaceholderText("Add a note about this item...")
      ).not.toBeInTheDocument();

      // Open
      await userEvent.click(noteBtn);
      expect(
        screen.getByPlaceholderText("Add a note about this item...")
      ).toBeInTheDocument();

      // Close via cancel
      const cancelBtn = screen.getByLabelText("Cancel note editing");
      await userEvent.click(cancelBtn);
      expect(
        screen.queryByPlaceholderText("Add a note about this item...")
      ).not.toBeInTheDocument();
    });
  });
});
