"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseFocusTrapOptions {
  onEscape?: () => void;
  autoFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  options: UseFocusTrapOptions = {}
) {
  const { onEscape, autoFocus = true } = options;
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }, []);

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    if (autoFocus) {
      requestAnimationFrame(() => {
        const elements = getFocusableElements();
        const autofocusEl = containerRef.current?.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
        if (autofocusEl) {
          autofocusEl.focus();
        } else if (elements.length > 0) {
          elements[0].focus();
        } else {
          containerRef.current?.focus();
        }
      });
    }

    return () => {
      if (previousFocusRef.current && previousFocusRef.current.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, autoFocus, getFocusableElements]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key !== "Tab") return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, onEscape, getFocusableElements]);

  return containerRef;
}
