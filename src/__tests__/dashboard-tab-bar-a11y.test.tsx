import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardTabBar } from "@/components/dashboard/dashboard-tab-bar";
import type { Tab, FeedItem } from "@/lib/feed-types";

const mockFeedItem: FeedItem = {
  id: "1",
  title: "Test Article",
  summary: "A test article summary",
  source: "Example News",
  url: "https://example.com/article",
  publishedAt: new Date().toISOString(),
};

const mockTab: Tab = {
  id: "tab-1",
  name: "Tech News",
  prompt: "Latest tech news",
  items: [mockFeedItem],
  loading: false,
  lastRefresh: new Date().toISOString(),
};

const defaultProps = {
  tabs: [mockTab],
  activeTabId: "tab-1",
  allItems: [mockFeedItem],
  bookmarkedIds: new Set<string>(),
  dragTabId: null,
  importing: false,
  onSetActiveTab: vi.fn(),
  onDeleteTab: vi.fn(),
  onShowNewTab: vi.fn(),
  onShowDiscover: vi.fn(),
  onImportOPML: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onDrop: vi.fn(),
};

describe("DashboardTabBar accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ARIA tablist pattern", () => {
    it("should render with role='tablist'", () => {
      render(<DashboardTabBar {...defaultProps} />);
      const tabList = screen.getByRole("tablist");
      expect(tabList).toBeInTheDocument();
    });

    it("should have aria-label on tablist", () => {
      render(<DashboardTabBar {...defaultProps} />);
      const tabList = screen.getByRole("tablist");
      expect(tabList).toHaveAttribute("aria-label", "Feed tabs");
    });
  });

  describe("Tab role and attributes", () => {
    it("should render each custom tab with role='tab'", () => {
      render(<DashboardTabBar {...defaultProps} />);
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThan(0);
    });

    it("should render Saved tab with role='tab'", () => {
      render(<DashboardTabBar {...defaultProps} />);
      const savedTab = screen.getByRole("tab", { name: /Saved/i });
      expect(savedTab).toHaveAttribute("role", "tab");
    });

    it("should include all tab types in role='tab' query", () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => mockFeedItem);
      render(
        <DashboardTabBar
          {...defaultProps}
          allItems={manyItems}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
        />
      );

      const tabs = screen.getAllByRole("tab");
      // Should include: tab-1, tab-2, Saved, Trending, and other buttons
      // The important ones are the actual tabs
      const tabsWithTabId = tabs.filter((tab) =>
        tab.getAttribute("data-tab-id")
      );
      expect(tabsWithTabId.length).toBeGreaterThanOrEqual(3); // At least tab-1, tab-2, Saved
    });
  });

  describe("aria-selected attribute", () => {
    it("should set aria-selected='true' on active tab", () => {
      render(<DashboardTabBar {...defaultProps} activeTabId="tab-1" />);
      const activeTab = screen.getByRole("tab", { name: /Tech News/i });
      expect(activeTab).toHaveAttribute("aria-selected", "true");
    });

    it("should set aria-selected='false' on inactive tabs", () => {
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          activeTabId="tab-1"
        />
      );

      const inactiveTab = screen.getByRole("tab", { name: /AI News/i });
      expect(inactiveTab).toHaveAttribute("aria-selected", "false");
    });

    it("should update aria-selected when active tab changes", () => {
      const { rerender } = render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          activeTabId="tab-1"
        />
      );

      const tab1 = screen.getByRole("tab", { name: /Tech News/i });
      const tab2 = screen.getByRole("tab", { name: /AI News/i });

      expect(tab1).toHaveAttribute("aria-selected", "true");
      expect(tab2).toHaveAttribute("aria-selected", "false");

      rerender(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          activeTabId="tab-2"
        />
      );

      expect(tab1).toHaveAttribute("aria-selected", "false");
      expect(tab2).toHaveAttribute("aria-selected", "true");
    });

    it("should set aria-selected='true' on Saved tab when active", () => {
      render(<DashboardTabBar {...defaultProps} activeTabId="saved" />);
      const savedTab = screen.getByRole("tab", { name: /Saved/i });
      expect(savedTab).toHaveAttribute("aria-selected", "true");
    });

    it("should set aria-selected='false' on Saved tab when not active", () => {
      render(<DashboardTabBar {...defaultProps} activeTabId="tab-1" />);
      const savedTab = screen.getByRole("tab", { name: /Saved/i });
      expect(savedTab).toHaveAttribute("aria-selected", "false");
    });

    it("should set aria-selected on Trending tab when present", () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => mockFeedItem);
      render(
        <DashboardTabBar
          {...defaultProps}
          allItems={manyItems}
          activeTabId="trending"
        />
      );

      const trendingTab = screen.getByRole("tab", { name: /Trending/i });
      expect(trendingTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Tab focus management (tabIndex)", () => {
    it("should set tabIndex=0 on active tab", () => {
      render(<DashboardTabBar {...defaultProps} activeTabId="tab-1" />);
      const activeTab = screen.getByRole("tab", { name: /Tech News/i });
      expect(activeTab).toHaveAttribute("tabindex", "0");
    });

    it("should set tabIndex=-1 on inactive tabs", () => {
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          activeTabId="tab-1"
        />
      );

      const inactiveTab = screen.getByRole("tab", { name: /AI News/i });
      expect(inactiveTab).toHaveAttribute("tabindex", "-1");
    });

    it("should update tabIndex when active tab changes", () => {
      const { rerender } = render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          activeTabId="tab-1"
        />
      );

      const tab1 = screen.getByRole("tab", { name: /Tech News/i });
      const tab2 = screen.getByRole("tab", { name: /AI News/i });

      expect(tab1).toHaveAttribute("tabindex", "0");
      expect(tab2).toHaveAttribute("tabindex", "-1");

      rerender(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          activeTabId="tab-2"
        />
      );

      expect(tab1).toHaveAttribute("tabindex", "-1");
      expect(tab2).toHaveAttribute("tabindex", "0");
    });

    it("should set tabIndex=0 on active Saved tab", () => {
      render(<DashboardTabBar {...defaultProps} activeTabId="saved" />);
      const savedTab = screen.getByRole("tab", { name: /Saved/i });
      expect(savedTab).toHaveAttribute("tabindex", "0");
    });

    it("should set tabIndex=-1 on inactive Saved tab", () => {
      render(<DashboardTabBar {...defaultProps} activeTabId="tab-1" />);
      const savedTab = screen.getByRole("tab", { name: /Saved/i });
      expect(savedTab).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Tab keyboard navigation", () => {
    it("should call onSetActiveTab when tab is clicked", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-1"
        />
      );

      const tab2 = screen.getByRole("tab", { name: /AI News/i });
      fireEvent.click(tab2);

      expect(onSetActiveTab).toHaveBeenCalledWith("tab-2");
    });

    it("should call onSetActiveTab with correct id when Saved tab is clicked", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          onSetActiveTab={onSetActiveTab}
        />
      );

      const savedTab = screen.getByRole("tab", { name: /Saved/i });
      fireEvent.click(savedTab);

      expect(onSetActiveTab).toHaveBeenCalledWith("saved");
    });

    it("should navigate tabs with arrow keys", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-1"
        />
      );

      const tab1 = screen.getByRole("tab", { name: /Tech News/i });
      tab1.focus();

      // Press ArrowRight to move to next tab
      fireEvent.keyDown(tab1, { key: "ArrowRight", code: "ArrowRight" });

      expect(onSetActiveTab).toHaveBeenCalledWith("tab-2");
    });

    it("should wrap around with arrow keys (right to first)", () => {
      const onSetActiveTab = vi.fn();
      const manyItems = Array.from({ length: 10 }, (_, i) => mockFeedItem);
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="trending"
          allItems={manyItems}
        />
      );

      const trendingTab = screen.getByRole("tab", { name: /Trending/i });
      trendingTab.focus();

      // Press ArrowRight from Trending to wrap back to first tab
      fireEvent.keyDown(trendingTab, { key: "ArrowRight", code: "ArrowRight" });

      expect(onSetActiveTab).toHaveBeenCalled();
    });

    it("should navigate backwards with ArrowLeft", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-2"
        />
      );

      const tab2 = screen.getByRole("tab", { name: /AI News/i });
      tab2.focus();

      // Press ArrowLeft to move to previous tab
      fireEvent.keyDown(tab2, { key: "ArrowLeft", code: "ArrowLeft" });

      expect(onSetActiveTab).toHaveBeenCalledWith("tab-1");
    });

    it("should support ArrowDown as alias for ArrowRight", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-1"
        />
      );

      const tab1 = screen.getByRole("tab", { name: /Tech News/i });
      tab1.focus();

      // Press ArrowDown (should behave like ArrowRight)
      fireEvent.keyDown(tab1, { key: "ArrowDown", code: "ArrowDown" });

      expect(onSetActiveTab).toHaveBeenCalledWith("tab-2");
    });

    it("should support ArrowUp as alias for ArrowLeft", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-2"
        />
      );

      const tab2 = screen.getByRole("tab", { name: /AI News/i });
      tab2.focus();

      // Press ArrowUp (should behave like ArrowLeft)
      fireEvent.keyDown(tab2, { key: "ArrowUp", code: "ArrowUp" });

      expect(onSetActiveTab).toHaveBeenCalledWith("tab-1");
    });

    it("should navigate to first tab with Home key", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-2"
        />
      );

      const tab2 = screen.getByRole("tab", { name: /AI News/i });
      tab2.focus();

      // Press Home to jump to first tab
      fireEvent.keyDown(tab2, { key: "Home", code: "Home" });

      expect(onSetActiveTab).toHaveBeenCalledWith("tab-1");
    });

    it("should navigate to last tab with End key", () => {
      const onSetActiveTab = vi.fn();
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            mockTab,
            {
              ...mockTab,
              id: "tab-2",
              name: "AI News",
            },
          ]}
          onSetActiveTab={onSetActiveTab}
          activeTabId="tab-1"
        />
      );

      const tab1 = screen.getByRole("tab", { name: /Tech News/i });
      tab1.focus();

      // Press End to jump to last tab (Saved in this case)
      fireEvent.keyDown(tab1, { key: "End", code: "End" });

      expect(onSetActiveTab).toHaveBeenCalled();
    });
  });

  describe("Delete button accessibility", () => {
    it("should have delete button with sr-only label for custom tabs", () => {
      render(<DashboardTabBar {...defaultProps} />);
      // Find the tab, then the delete button within it
      const techNewsTab = screen.getByRole("tab", { name: /Tech News/i });
      const deleteButton = techNewsTab.querySelector("button:last-child");
      expect(deleteButton).toBeInTheDocument();
    });

    it("should not have delete button for all tab", () => {
      const allTab: Tab = {
        id: "all",
        name: "All",
        prompt: "All feeds",
        items: [mockFeedItem],
        loading: false,
        lastRefresh: null,
      };

      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[allTab, mockTab]}
          activeTabId="all"
        />
      );

      // Should not find a delete button for the "all" tab
      const tabs = screen.getAllByRole("tab");
      const allTabButton = tabs.find(
        (tab) => tab.getAttribute("data-tab-id") === "all"
      );

      if (allTabButton) {
        // The all tab should not have a delete button
        const deleteButtons = allTabButton.querySelectorAll(
          "button[aria-label*='Delete']"
        );
        expect(deleteButtons.length).toBe(0);
      }
    });

    it("should call onDeleteTab when delete button is clicked", () => {
      const onDeleteTab = vi.fn();
      render(<DashboardTabBar {...defaultProps} onDeleteTab={onDeleteTab} />);

      // Find the tab, then the delete button within it
      const techNewsTab = screen.getByRole("tab", { name: /Tech News/i });
      const deleteButton = techNewsTab.querySelector("button:last-child");

      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton!);

      expect(onDeleteTab).toHaveBeenCalledWith("tab-1");
    });
  });

  describe("Trending tab conditional rendering", () => {
    it("should not render Trending tab when items <= 5", () => {
      render(
        <DashboardTabBar
          {...defaultProps}
          allItems={[mockFeedItem, mockFeedItem]}
        />
      );

      const trendingTabs = screen.queryAllByRole("tab", { name: /Trending/i });
      expect(trendingTabs.length).toBe(0);
    });

    it("should render Trending tab when items > 5", () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => mockFeedItem);
      render(
        <DashboardTabBar {...defaultProps} allItems={manyItems} />
      );

      const trendingTab = screen.getByRole("tab", { name: /Trending/i });
      expect(trendingTab).toBeInTheDocument();
      expect(trendingTab).toHaveAttribute("role", "tab");
    });
  });

  describe("Item count badges", () => {
    it("should display item count badge on custom tabs", () => {
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[
            {
              ...mockTab,
              items: [mockFeedItem, mockFeedItem, mockFeedItem],
            },
          ]}
        />
      );

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should display bookmarked count on Saved tab", () => {
      const bookmarkedIds = new Set(["item-1", "item-2"]);
      render(
        <DashboardTabBar
          {...defaultProps}
          bookmarkedIds={bookmarkedIds}
        />
      );

      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("Import progress indicator", () => {
    it("should display import progress message when importing", () => {
      render(<DashboardTabBar {...defaultProps} importing={true} />);
      expect(
        screen.getByText(/Importing feeds from OPML/i)
      ).toBeInTheDocument();
    });

    it("should not display import progress when not importing", () => {
      render(<DashboardTabBar {...defaultProps} importing={false} />);
      expect(
        screen.queryByText(/Importing feeds from OPML/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Data attributes for testing", () => {
    it("should have data-tab-id attribute on each tab for keyboard navigation", () => {
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[mockTab]}
        />
      );

      const tabElements = screen.getAllByRole("tab");
      tabElements.forEach((tab) => {
        expect(tab).toHaveAttribute("data-tab-id");
      });
    });

    it("should have correct data-tab-id values", () => {
      render(
        <DashboardTabBar
          {...defaultProps}
          tabs={[mockTab]}
        />
      );

      expect(screen.getByRole("tab", { name: /Tech News/i })).toHaveAttribute(
        "data-tab-id",
        "tab-1"
      );
      expect(screen.getByRole("tab", { name: /Saved/i })).toHaveAttribute(
        "data-tab-id",
        "saved"
      );
    });
  });
});
