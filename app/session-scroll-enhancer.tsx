"use client";

import { useEffect } from "react";

function updateMobileViewportHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  if (!Number.isFinite(height) || height <= 0) return;
  document.documentElement.style.setProperty("--cgv-mobile-viewport-height", `${Math.round(height)}px`);
}

export default function SessionScrollEnhancer() {
  useEffect(() => {
    updateMobileViewportHeight();

    const onViewportChange = () => window.requestAnimationFrame(updateMobileViewportHeight);

    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("orientationchange", onViewportChange, { passive: true });
    window.visualViewport?.addEventListener("resize", onViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      document.documentElement.style.removeProperty("--cgv-mobile-viewport-height");
    };
  }, []);

  return null;
}
