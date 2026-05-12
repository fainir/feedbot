"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Pull-to-refresh — touch gesture handler.
 *
 * - Activates only when scrollY == 0 (i.e. user pulled from the very top).
 * - Damped (drag * 0.5) so the indicator doesn't fly off-screen on long pulls.
 * - Caps at MAX px so finger doesn't have to leave the viewport.
 * - Calls onRefresh when released past THRESHOLD; otherwise snaps back.
 * - Disabled during an in-flight refresh and when more than one finger is down
 *   (e.g. pinch-zoom), so it doesn't compete with normal interactions.
 *
 * Note: we deliberately do NOT preventDefault touch events — passive listeners
 * keep scroll buttery on iOS. The native overscroll bounce on iOS Safari plays
 * alongside our indicator without conflict.
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>): {
  pullPx: number;
  refreshing: boolean;
} {
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const rafPending = useRef(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // No touch capability → skip entirely (desktop). Saves listeners + state.
    if (!("ontouchstart" in window) && !(navigator.maxTouchPoints > 0)) return;

    const THRESHOLD = 64;
    const MAX = 100;
    const DAMP = 0.5;

    const flush = () => {
      rafPending.current = false;
      setPullPx(currentY.current);
    };
    const queueFlush = () => {
      if (!rafPending.current) {
        rafPending.current = true;
        requestAnimationFrame(flush);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const raw = e.touches[0].clientY - startY.current;
      if (raw <= 0) {
        // Finger moved back up past start — cancel.
        currentY.current = 0;
        pulling.current = false;
        queueFlush();
        return;
      }
      currentY.current = Math.min(MAX, raw * DAMP);
      queueFlush();
    };

    const settle = (dy: number) => {
      currentY.current = dy;
      setPullPx(dy);
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const dy = currentY.current;
      if (dy >= THRESHOLD) {
        // Show the spinner at a position slightly below threshold.
        settle(THRESHOLD - 8);
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } catch {
          /* ignore — surface errors via the caller's existing flow */
        }
        settle(0);
        setRefreshing(false);
      } else {
        settle(0);
      }
    };

    const onTouchCancel = () => {
      if (!pulling.current) return;
      pulling.current = false;
      settle(0);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchCancel);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  return { pullPx, refreshing };
}

/**
 * Visual indicator. Mount it once near the top of the page; the hook drives
 * its translateY through pullPx and animates the icon's rotation up to the
 * trigger threshold, then spins while the refresh is in-flight.
 */
export function PullToRefreshIndicator({
  pullPx,
  refreshing,
}: {
  pullPx: number;
  refreshing: boolean;
}) {
  const visible = pullPx > 0 || refreshing;
  if (!visible) return null;
  const progress = Math.min(pullPx / 56, 1);
  return (
    <div
      className="pointer-events-none fixed top-0 left-1/2 z-[60]"
      style={{
        transform: `translateX(-50%) translateY(${Math.max(pullPx - 36, 4)}px)`,
        opacity: refreshing ? 1 : progress,
      }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-card border border-border shadow-md">
        <RefreshCw
          className={`h-4 w-4 text-text ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}
