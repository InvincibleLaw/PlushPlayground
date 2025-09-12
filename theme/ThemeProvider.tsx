import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useResponsive } from "../hooks/useResponsive";
import { getResolvedTokens, ResolvedTokens } from "./resolveTokens";

const ThemeContext = createContext<ResolvedTokens | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const r = useResponsive();

  const t = useMemo(
    () => getResolvedTokens(r),
    [r.width, r.height, r.rem, r.scale, r.hairline, r.bp.tablet, r.bp.landscape]
  );

  return <ThemeContext.Provider value={t}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
