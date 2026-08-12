"use client";

import { useEffect } from "react";

function closeMobileDrawerState() {
  document.body.classList.remove("cgv-mobile-menu-open");
  document.documentElement.classList.remove("cgv-mobile-menu-open");

  const overlay = document.querySelector<HTMLButtonElement>(".button-safety-menu-overlay");
  if (overlay) overlay.click();
}

export default function MobileSidebarBottomActions() {
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>(".sidebar-bottom button");
      if (!button) return;

      // The mobile drawer is controlled by ButtonSafetyNet. Close the actual
      // React-owned overlay state before the bottom action continues through its
      // existing Settings, Help Centre, or Sign out handler. This prevents the
      // invisible overlay / bottom navigation from swallowing the tap on Safari.
      closeMobileDrawerState();
    };

    window.addEventListener("click", onClickCapture, true);
    return () => window.removeEventListener("click", onClickCapture, true);
  }, []);

  return null;
}
