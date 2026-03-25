"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type KeyboardEvent,
} from "react";
import {
  Plus,
  Bookmark,
  Check,
  Shuffle,
  RefreshCw,
  Share2,
  Settings,
  MoreVertical,
  BookOpen,
  CheckCircle,
  FolderPlus,
  VolumeX,
  Layers,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  className?: string;
}

interface FloatingActionMenuProps {
  onRefresh?: () => void;
  onMarkAllRead?: () => void;
  onRandomArticle?: () => void;
  onFocusMode?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
}

interface LongPressMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenReader?: () => void;
  onBookmark?: () => void;
  onToggleRead?: () => void;
  isRead?: boolean;
  onShare?: () => void;
  onAddToCollection?: () => void;
  onMuteSource?: () => void;
  onSimilarArticles?: () => void;
}

interface QuickActionsBarProps {
  children: ReactNode;
  onRefresh?: () => void;
  onMarkAllRead?: () => void;
  onRandomArticle?: () => void;
  onFocusMode?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Touch detection                                                    */
/* ------------------------------------------------------------------ */

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouch(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isTouch;
}

/* ------------------------------------------------------------------ */
/*  SwipeableCard                                                      */
/* ------------------------------------------------------------------ */

const SWIPE_THRESHOLD = 80;

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  className = "",
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isSwiping = useRef(false);
  const [offset, setOffset] = useState(0);
  const [triggered, setTriggered] = useState<"left" | "right" | null>(null);
  const isTouch = useIsTouchDevice();

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    isSwiping.current = true;
    setTriggered(null);
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (!isSwiping.current) return;
    const diff = e.touches[0].clientX - startX.current;
    currentX.current = diff;
    // Dampen the swipe for a rubber-band feel
    const dampened = diff > 0
      ? Math.min(diff * 0.6, 160)
      : Math.max(diff * 0.6, -160);
    setOffset(dampened);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isSwiping.current = false;
    const diff = currentX.current;

    if (diff > SWIPE_THRESHOLD) {
      setTriggered("right");
      setOffset(0);
      onSwipeRight?.();
    } else if (diff < -SWIPE_THRESHOLD) {
      setTriggered("left");
      setOffset(0);
      onSwipeLeft?.();
    } else {
      setOffset(0);
    }

    // Clear triggered state after animation
    setTimeout(() => setTriggered(null), 400);
  }, [onSwipeRight, onSwipeLeft]);

  // Keyboard accessibility: arrow keys trigger swipe actions
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && onSwipeRight) {
        e.preventDefault();
        setTriggered("right");
        onSwipeRight();
        setTimeout(() => setTriggered(null), 400);
      } else if (e.key === "ArrowLeft" && onSwipeLeft) {
        e.preventDefault();
        setTriggered("left");
        onSwipeLeft();
        setTimeout(() => setTriggered(null), 400);
      }
    },
    [onSwipeRight, onSwipeLeft]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${className}`}
      role="group"
      aria-label="Swipeable card — arrow right to bookmark, arrow left to mark read"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Swipe-right background (bookmark) */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-6 rounded-xl bg-amber-500/90 dark:bg-amber-600/90 transition-opacity"
        style={{ opacity: offset > 20 ? Math.min(offset / SWIPE_THRESHOLD, 1) : 0 }}
        aria-hidden
      >
        <Bookmark className="h-6 w-6 text-white" />
        <span className="ml-2 text-sm font-medium text-white">Bookmark</span>
      </div>

      {/* Swipe-left background (mark read) */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-6 rounded-xl bg-green-500/90 dark:bg-green-600/90 transition-opacity"
        style={{ opacity: offset < -20 ? Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1) : 0 }}
        aria-hidden
      >
        <span className="mr-2 text-sm font-medium text-white">Mark read</span>
        <Check className="h-6 w-6 text-white" />
      </div>

      {/* Card content */}
      <div
        className={`relative z-10 transition-transform ${
          triggered === "right"
            ? "animate-haptic-pulse"
            : triggered === "left"
            ? "animate-haptic-pulse"
            : ""
        }`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping.current ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
        onTouchStart={isTouch ? handleTouchStart : undefined}
        onTouchMove={isTouch ? handleTouchMove : undefined}
        onTouchEnd={isTouch ? handleTouchEnd : undefined}
      >
        {children}
      </div>

      {/* Haptic-style CSS animation */}
      <style jsx>{`
        @keyframes haptic-pulse {
          0% { transform: scale(1); }
          30% { transform: scale(0.97); }
          60% { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
        .animate-haptic-pulse {
          animation: haptic-pulse 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FloatingActionMenu                                                 */
/* ------------------------------------------------------------------ */

interface FabAction {
  icon: ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}

export function FloatingActionMenu({
  onRefresh,
  onMarkAllRead,
  onRandomArticle,
  onFocusMode,
  onShare,
  onSettings,
}: FloatingActionMenuProps) {
  const [open, setOpen] = useState(false);
  const isTouch = useIsTouchDevice();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const actions: FabAction[] = [
    { icon: <RefreshCw className="h-4.5 w-4.5" />, label: "Refresh", color: "bg-blue-500 dark:bg-blue-600", onClick: onRefresh },
    { icon: <CheckCircle className="h-4.5 w-4.5" />, label: "All read", color: "bg-green-500 dark:bg-green-600", onClick: onMarkAllRead },
    { icon: <Shuffle className="h-4.5 w-4.5" />, label: "Random", color: "bg-purple-500 dark:bg-purple-600", onClick: onRandomArticle },
    { icon: <Eye className="h-4.5 w-4.5" />, label: "Focus", color: "bg-orange-500 dark:bg-orange-600", onClick: onFocusMode },
    { icon: <Share2 className="h-4.5 w-4.5" />, label: "Share", color: "bg-pink-500 dark:bg-pink-600", onClick: onShare },
    { icon: <Settings className="h-4.5 w-4.5" />, label: "Settings", color: "bg-gray-500 dark:bg-gray-600", onClick: onSettings },
  ];

  // Arc layout: spread actions in an arc above the FAB
  const arcRadius = 90;
  const arcStart = -150; // degrees
  const arcEnd = -30;    // degrees
  const arcStep = (arcEnd - arcStart) / (actions.length - 1);

  if (!isTouch) return null;

  return (
    <div ref={menuRef} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Arc menu items */}
      <div className="relative z-50">
        {actions.map((action, i) => {
          const angle = (arcStart + arcStep * i) * (Math.PI / 180);
          const x = Math.cos(angle) * arcRadius;
          const y = Math.sin(angle) * arcRadius;

          return (
            <button
              key={action.label}
              onClick={() => {
                action.onClick?.();
                setOpen(false);
              }}
              className={`absolute flex flex-col items-center gap-1 transition-all duration-300 ${
                open
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-0 opacity-0"
              }`}
              style={{
                left: `calc(50% + ${x}px - 24px)`,
                top: `calc(50% + ${y}px - 24px)`,
                transitionDelay: open ? `${i * 40}ms` : "0ms",
              }}
              aria-label={action.label}
              tabIndex={open ? 0 : -1}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ${action.color}`}
              >
                {action.icon}
              </span>
              <span className="text-[10px] font-medium text-text">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform duration-300 hover:bg-primary-dark ${
          open ? "rotate-45" : ""
        }`}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LongPressMenu                                                      */
/* ------------------------------------------------------------------ */

export function LongPressMenu({
  x,
  y,
  onClose,
  onOpenReader,
  onBookmark,
  onToggleRead,
  isRead = false,
  onShare,
  onAddToCollection,
  onMuteSource,
  onSimilarArticles,
}: LongPressMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Clamp position to viewport
  const menuWidth = 200;
  const menuHeight = 320;
  const clampedX = Math.min(Math.max(x, 8), window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(Math.max(y, 8), window.innerHeight - menuHeight - 8);

  const items = [
    { icon: <BookOpen className="h-4 w-4" />, label: "Open in reader", onClick: onOpenReader },
    { icon: <Bookmark className="h-4 w-4" />, label: "Bookmark", onClick: onBookmark },
    { icon: isRead ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4" />, label: isRead ? "Mark unread" : "Mark read", onClick: onToggleRead },
    { icon: <Share2 className="h-4 w-4" />, label: "Share", onClick: onShare },
    { icon: <FolderPlus className="h-4 w-4" />, label: "Add to collection", onClick: onAddToCollection },
    { icon: <VolumeX className="h-4 w-4" />, label: "Mute source", onClick: onMuteSource },
    { icon: <Layers className="h-4 w-4" />, label: "Similar articles", onClick: onSimilarArticles },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Menu */}
      <div
        ref={menuRef}
        role="menu"
        className={`fixed z-50 w-[200px] rounded-xl border border-border bg-bg-card shadow-xl transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
        style={{ left: clampedX, top: clampedY }}
      >
        <div className="py-1">
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-xs text-text transition-colors hover:bg-bg-hover"
              tabIndex={0}
            >
              <span className="text-text-muted">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  useLongPress hook                                                  */
/* ------------------------------------------------------------------ */

export function useLongPress(
  callback: (position: { x: number; y: number }) => void,
  delay = 500
): {
  onTouchStart: (e: ReactTouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      posRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      timerRef.current = setTimeout(() => {
        callback(posRef.current);
      }, delay);
    },
    [callback, delay]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      callback({ x: e.clientX, y: e.clientY });
    },
    [callback]
  );

  return {
    onTouchStart,
    onTouchEnd: clear,
    onTouchMove: clear,
    onContextMenu,
  };
}

/* ------------------------------------------------------------------ */
/*  QuickActionsBar (composition root)                                 */
/* ------------------------------------------------------------------ */

export function QuickActionsBar({
  children,
  onRefresh,
  onMarkAllRead,
  onRandomArticle,
  onFocusMode,
  onShare,
  onSettings,
}: QuickActionsBarProps) {
  return (
    <div className="relative">
      {children}
      <FloatingActionMenu
        onRefresh={onRefresh}
        onMarkAllRead={onMarkAllRead}
        onRandomArticle={onRandomArticle}
        onFocusMode={onFocusMode}
        onShare={onShare}
        onSettings={onSettings}
      />
    </div>
  );
}
