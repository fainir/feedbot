"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { User } from "@supabase/supabase-js";

type Theme = "dark" | "light";

function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "light";
}

/**
 * Keeps theme in sync between localStorage (next-themes) and the user's
 * profiles.theme row.
 *
 * Behaviour:
 *   - On the user object becoming available: GET /api/user/theme. If the
 *     server value differs from localStorage, apply server → local (server
 *     wins, so a choice made on another device follows the user).
 *   - On every theme change after that point: PUT it back to the server so
 *     future devices and sessions see the latest.
 *
 * Pass `null` for `user` while signed out — the hook then does nothing,
 * matching the guest behaviour (localStorage-only).
 */
export function useThemeSync(user: User | null) {
  const { theme, setTheme } = useTheme();
  // Suppress the first save right after a server-driven set, so we don't
  // immediately PUT the same value back.
  const skipNextSave = useRef(false);
  const lastSyncedUserId = useRef<string | null>(null);

  // Pull on login.
  useEffect(() => {
    if (!user) {
      lastSyncedUserId.current = null;
      return;
    }
    // Only pull when the user identity changes (initial load, login, switch).
    if (lastSyncedUserId.current === user.id) return;
    lastSyncedUserId.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/theme");
        if (!res.ok) return;
        const { theme: serverTheme } = (await res.json()) as { theme?: unknown };
        if (cancelled || !isTheme(serverTheme)) return;
        if (serverTheme !== theme) {
          skipNextSave.current = true;
          setTheme(serverTheme);
        }
      } catch { /* network blip — keep whatever localStorage has */ }
    })();
    return () => { cancelled = true; };
  }, [user, theme, setTheme]);

  // Push on change.
  useEffect(() => {
    if (!user || !isTheme(theme)) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    // Fire-and-forget — UI doesn't block on persistence.
    fetch("/api/user/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch(() => { /* ignore — localStorage already has the value */ });
  }, [theme, user]);
}
