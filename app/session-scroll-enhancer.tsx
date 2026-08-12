"use client";

import { useEffect } from "react";

const TOKEN_KEYS = [
  "cgv-exams-session-token",
  "cgv-exams-session-role",
  "cgv-exams-session-user",
];

const ENDPOINT_KEY = "cgv-exams-api-endpoint";

function normalise(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function clearClientSession() {
  TOKEN_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });

  document.body.classList.remove("cgv-mobile-menu-open");
  document.documentElement.classList.remove("cgv-mobile-menu-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("inset");
  document.body.style.removeProperty("width");
}

function notifyBackendLogout(token: string | null) {
  const endpoint = window.sessionStorage.getItem(ENDPOINT_KEY)
    || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim()
    || "";

  if (!endpoint || !token) return;

  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "logout", token }),
    keepalive: true,
  }).catch(() => undefined);
}

function updateMobileViewportHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  if (!Number.isFinite(height) || height <= 0) return;
  document.documentElement.style.setProperty("--cgv-mobile-viewport-height", `${Math.round(height)}px`);
}

export default function SessionScrollEnhancer() {
  useEffect(() => {
    updateMobileViewportHeight();

    const onViewportChange = () => window.requestAnimationFrame(updateMobileViewportHeight);
    const onSignOut = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("button");
      if (!button || normalise(button.getAttribute("aria-label") || button.textContent) !== "sign out") return;

      // Mobile Safari can leave the off-canvas menu/overlay alive long enough to
      // swallow the React logout update. Handle sign out as a navigation boundary:
      // close the mobile menu immediately, clear persisted credentials, then let
      // the app's own onClick run before using a hard navigation as a fallback.
      document.body.classList.remove("cgv-mobile-menu-open");
      document.documentElement.classList.remove("cgv-mobile-menu-open");

      const token = window.sessionStorage.getItem("cgv-exams-session-token");
      notifyBackendLogout(token);
      clearClientSession();

      window.setTimeout(() => {
        if (document.querySelector(".login-page")) return;
        window.location.replace(window.location.href.split("#")[0]);
      }, 80);
    };

    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("orientationchange", onViewportChange, { passive: true });
    window.visualViewport?.addEventListener("resize", onViewportChange, { passive: true });
    document.addEventListener("click", onSignOut, true);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      document.removeEventListener("click", onSignOut, true);
      document.documentElement.style.removeProperty("--cgv-mobile-viewport-height");
    };
  }, []);

  return null;
}
