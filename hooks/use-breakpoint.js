"use client";

import { useState, useEffect } from "react";

/** Breakpoint ranges: Mobile 0–768px, Tablet 769–1280px, Desktop 1281px+ */
export const BREAKPOINTS = {
  MOBILE_MAX: 768,
  TABLET_MIN: 769,
  TABLET_MAX: 1280,
  DESKTOP_MIN: 1281,
};

/**
 * Returns current viewport breakpoint: "mobile" | "tablet" | "desktop".
 * Mobile: 0–768px, Tablet: 769–1280px, Desktop: 1281px+.
 * @returns {"mobile" | "tablet" | "desktop"}
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState("desktop");

  useEffect(() => {
    const getBreakpoint = () => {
      const w = typeof window === "undefined" ? 1281 : window.innerWidth;
      if (w <= BREAKPOINTS.MOBILE_MAX) return "mobile";
      if (w <= BREAKPOINTS.TABLET_MAX) return "tablet";
      return "desktop";
    };

    setBreakpoint(getBreakpoint());
    const handleResize = () => setBreakpoint(getBreakpoint());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
}

/** True when viewport is tablet or desktop (≥769px). */
export function useIsTabletOrDesktop() {
  const bp = useBreakpoint();
  return bp === "tablet" || bp === "desktop";
}

/** True when viewport is mobile only (≤768px). */
export function useIsMobile() {
  const bp = useBreakpoint();
  return bp === "mobile";
}
