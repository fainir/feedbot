"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// Default to dark for everyone. enableSystem=false means we don't auto-flip
// to light just because the OS is in light mode — the user has to opt in
// explicitly by clicking the theme toggle (the value then persists in
// localStorage via next-themes, and we mirror it to profiles.theme for
// logged-in users via /api/user/theme).
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="myfeed-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
