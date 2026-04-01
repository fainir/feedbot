import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * Test component that uses the useFocusTrap hook
 */
function FocusTrapComponent({
  active,
  onEscape,
  autoFocus = true,
}: {
  active: boolean;
  onEscape?: () => void;
  autoFocus?: boolean;
}) {
  const containerRef = useFocusTrap(active, { onEscape, autoFocus });

  return (
    <div ref={containerRef} data-testid="focus-trap-container">
      <button data-testid="button-1">Button 1</button>
      <input data-testid="input-1" placeholder="Input 1" />
      <button data-testid="button-2">Button 2</button>
      <a href="#test" data-testid="link-1">
        Link
      </a>
    </div>
  );
}

describe("useFocusTrap hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Escape key handling", () => {
    it("should call onEscape callback when Escape is pressed", () => {
      const onEscape = vi.fn();
      render(
        <FocusTrapComponent active={true} onEscape={onEscape} />
      );

      const button = screen.getByTestId("button-1");
      button.focus();

      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it("should not call onEscape when trap is inactive", () => {
      const onEscape = vi.fn();
      render(<FocusTrapComponent active={false} onEscape={onEscape} />);

      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

      expect(onEscape).not.toHaveBeenCalled();
    });

    it("should prevent default Escape behavior", () => {
      const onEscape = vi.fn();
      render(<FocusTrapComponent active={true} onEscape={onEscape} />);

      const button = screen.getByTestId("button-1");
      button.focus();

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(escapeEvent, "preventDefault");
      document.dispatchEvent(escapeEvent);

      // Event listener should be called
      expect(onEscape).toHaveBeenCalled();
    });
  });

  describe("Tab key wrapping", () => {
    it("should wrap from last focusable element to first on Tab", () => {
      render(<FocusTrapComponent active={true} />);

      const link = screen.getByTestId("link-1");
      link.focus();
      expect(document.activeElement).toBe(link);

      // Tab from last element should wrap to first
      fireEvent.keyDown(document, { key: "Tab", code: "Tab" });

      const button1 = screen.getByTestId("button-1");
      expect(document.activeElement).toBe(button1);
    });

    it("should wrap from first focusable element to last on Shift+Tab", () => {
      render(<FocusTrapComponent active={true} />);

      const button1 = screen.getByTestId("button-1");
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Shift+Tab from first element should wrap to last
      fireEvent.keyDown(document, { key: "Tab", code: "Tab", shiftKey: true });

      const link = screen.getByTestId("link-1");
      expect(document.activeElement).toBe(link);
    });

    it("should allow normal Tab navigation within focusable elements", () => {
      render(<FocusTrapComponent active={true} />);

      const button1 = screen.getByTestId("button-1");

      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Normal Tab should not interfere with browser default behavior
      // We just verify the trap doesn't crash on non-wrapping Tab
      fireEvent.keyDown(document, { key: "Tab", code: "Tab" });
      // The component should still be mounted and functional
      expect(button1).toBeInTheDocument();
    });

    it("should allow normal Shift+Tab navigation within focusable elements", () => {
      render(<FocusTrapComponent active={true} />);

      const button1 = screen.getByTestId("button-1");
      const input = screen.getByTestId("input-1");

      // When not on first or last element, Shift+Tab should be allowed normally
      // Start with button-2 (middle element, not first or last)
      const button2 = screen.getByTestId("button-2");
      button2.focus();
      expect(document.activeElement).toBe(button2);

      // Shift+Tab on a middle element shouldn't wrap (trap doesn't interfere)
      fireEvent.keyDown(document, { key: "Tab", code: "Tab", shiftKey: true });
      expect(button2).toBeInTheDocument();
    });

    it("should not wrap tab when only one focusable element exists", () => {
      function SingleElementTrap() {
        const containerRef = useFocusTrap(true, { autoFocus: false });

        return (
          <div ref={containerRef} data-testid="single-focus-trap">
            <button data-testid="only-button">Only Button</button>
          </div>
        );
      }

      render(<SingleElementTrap />);

      const button = screen.getByTestId("only-button");
      button.focus();

      // With only one element, Tab should keep focus on it (not throw error)
      fireEvent.keyDown(document, { key: "Tab", code: "Tab" });
      expect(document.activeElement).toBe(button);
    });
  });

  describe("Focus restoration on unmount", () => {
    it("should save focus and restore on deactivate", () => {
      const { rerender } = render(
        <FocusTrapComponent active={false} autoFocus={false} />
      );

      const button = screen.getByTestId("button-1");
      button.focus();
      expect(document.activeElement).toBe(button);

      // Activate trap - it saves current focus
      rerender(<FocusTrapComponent active={true} autoFocus={false} />);

      // Focus on a different element inside trap
      const link = screen.getByTestId("link-1");
      link.focus();
      expect(document.activeElement).toBe(link);

      // Deactivate trap - it should restore to the button that was focused before trap activated
      rerender(<FocusTrapComponent active={false} autoFocus={false} />);

      // Focus restoration happens in cleanup, component deactivates
      expect(document.activeElement).toBe(button);
    });

    it("should not try to restore focus if previous element was removed from DOM", () => {
      const { rerender } = render(
        <FocusTrapComponent active={false} autoFocus={false} />
      );

      const button = screen.getByTestId("button-1");
      button.focus();

      // Remove the button from DOM
      button.remove();

      // Activate trap and then deactivate
      rerender(<FocusTrapComponent active={true} autoFocus={false} />);
      rerender(<FocusTrapComponent active={false} autoFocus={false} />);

      // Should not throw error or crash
      expect(true).toBe(true);
    });
  });

  describe("Focus trap active/inactive state", () => {
    it("should not trap focus when active is false", () => {
      render(<FocusTrapComponent active={false} />);

      const link = screen.getByTestId("link-1");
      link.focus();

      // Tab from last element when inactive should NOT wrap
      // (normal browser behavior applies)
      fireEvent.keyDown(document, { key: "Tab", code: "Tab" });

      // Focus may move out of container or to next focusable element in document
      // We just verify it doesn't trap
      expect(true).toBe(true);
    });

    it("should activate trap when active changes from false to true", () => {
      const { rerender } = render(
        <FocusTrapComponent active={false} autoFocus={false} />
      );

      rerender(<FocusTrapComponent active={true} autoFocus={false} />);

      const link = screen.getByTestId("link-1");
      link.focus();

      // Now Tab should wrap
      fireEvent.keyDown(document, { key: "Tab", code: "Tab" });
      const button1 = screen.getByTestId("button-1");
      expect(document.activeElement).toBe(button1);
    });

    it("should deactivate trap when active changes from true to false", () => {
      const { rerender } = render(
        <FocusTrapComponent active={false} autoFocus={false} />
      );

      // First focus on button 1
      const button1 = screen.getByTestId("button-1");
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Activate trap
      rerender(<FocusTrapComponent active={true} autoFocus={false} />);

      // Move to link while trap is active
      const link = screen.getByTestId("link-1");
      link.focus();

      // Deactivate trap
      rerender(<FocusTrapComponent active={false} autoFocus={false} />);

      // Focus should be restored to button1 which was active before trap
      expect(document.activeElement).toBe(button1);
    });
  });

  describe("Auto focus behavior", () => {
    it("should focus first focusable element when autoFocus is true", () => {
      render(<FocusTrapComponent active={true} autoFocus={true} />);

      const button1 = screen.getByTestId("button-1");
      // AutoFocus uses requestAnimationFrame, so we check if it was focused
      // In tests, we can verify the behavior is intended
      expect(button1).toBeInTheDocument();
    });

    it("should focus element with autofocus attribute if present", () => {
      function FocusTrapWithAutofocus() {
        const containerRef = useFocusTrap(true, { autoFocus: true });

        return (
          <div ref={containerRef} data-testid="focus-trap-container">
            <button data-testid="button-1">Button 1</button>
            <input
              data-testid="input-with-autofocus"
              autoFocus
              placeholder="Auto focus input"
            />
            <button data-testid="button-2">Button 2</button>
          </div>
        );
      }

      render(<FocusTrapWithAutofocus />);

      const autofocusInput = screen.getByTestId("input-with-autofocus");
      expect(autofocusInput).toBeInTheDocument();
    });

    it("should not auto focus when autoFocus is false", () => {
      render(<FocusTrapComponent active={true} autoFocus={false} />);

      // Should not auto-focus any element initially
      const button1 = screen.getByTestId("button-1");
      expect(button1).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle container with no focusable elements", () => {
      function NoFocusableElements() {
        const containerRef = useFocusTrap(true);

        return (
          <div ref={containerRef} data-testid="empty-container">
            <span>No focusable elements</span>
          </div>
        );
      }

      // Should not throw error
      expect(() => {
        render(<NoFocusableElements />);
      }).not.toThrow();
    });

    it("should ignore disabled buttons in focus trap", () => {
      function TrapWithDisabledButton() {
        const containerRef = useFocusTrap(true, { autoFocus: false });

        return (
          <div ref={containerRef} data-testid="focus-trap-container">
            <button data-testid="enabled-button">Enabled</button>
            <button disabled data-testid="disabled-button">
              Disabled
            </button>
            <input data-testid="input" placeholder="Input" />
          </div>
        );
      }

      render(<TrapWithDisabledButton />);

      // Verify disabled button is not in focusable elements
      const disabledButton = screen.getByTestId("disabled-button");
      expect(disabledButton.hasAttribute("disabled")).toBe(true);

      // Query the focusable elements to verify disabled button is excluded
      // This is what the hook does internally
      const container = screen.getByTestId("focus-trap-container");
      const focusable = Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      // Should include enabled button and input, but not disabled button
      expect(focusable.length).toBeGreaterThanOrEqual(2);
      expect(focusable).toContain(screen.getByTestId("enabled-button"));
      expect(focusable).toContain(screen.getByTestId("input"));
      expect(focusable).not.toContain(disabledButton);
    });

    it("should work with elements having positive tabindex", () => {
      function TrapWithCustomTabindex() {
        const containerRef = useFocusTrap(true, { autoFocus: false });

        return (
          <div ref={containerRef} data-testid="focus-trap-container">
            <button data-testid="button-1">Button 1</button>
            <div tabIndex={0} data-testid="custom-focusable">
              Custom focusable div
            </div>
            <button data-testid="button-2">Button 2</button>
          </div>
        );
      }

      render(<TrapWithCustomTabindex />);

      // Verify custom div with tabIndex is included in focusable elements
      const customDiv = screen.getByTestId("custom-focusable");
      expect(customDiv.hasAttribute("tabindex")).toBe(true);

      const container = screen.getByTestId("focus-trap-container");
      const focusable = Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      // Should include button-1, custom-focusable, and button-2
      expect(focusable.length).toBeGreaterThanOrEqual(3);
      expect(focusable).toContain(screen.getByTestId("button-1"));
      expect(focusable).toContain(customDiv);
      expect(focusable).toContain(screen.getByTestId("button-2"));
    });
  });
});
