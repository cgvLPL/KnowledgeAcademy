"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

const SESSION_KEYS = [
  "cgv-exams-session-token",
  "cgv-exams-session-role",
  "cgv-exams-session-user",
];

const HELP_CENTRE_URL = "https://github.com/rayhanmawuntu-stack/CGV.Exams#google-sheets-connection";

type AppInteractions = {
  mobileMenuOpen: boolean;
  settingsOpen: boolean;
  closeMobileMenu: () => void;
  closeSettings: () => void;
  openSettings: () => void;
  toggleMobileMenu: () => void;
};

const AppInteractionContext = createContext<AppInteractions | null>(null);

function normalize(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function buttonLabel(button: HTMLButtonElement) {
  return normalize(button.getAttribute("aria-label") || button.dataset.cgvActionLabel || button.textContent);
}

function clearPersistedSession() {
  SESSION_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });
}

function scheduleSignOutFallback() {
  window.setTimeout(() => {
    if (document.querySelector(".login-page")) return;
    window.location.replace(window.location.href.split("#")[0]);
  }, 120);
}

export function AppInteractionProvider({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((open) => !open), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSettings = useCallback(() => {
    setMobileMenuOpen(false);
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cgv-mobile-menu-open", mobileMenuOpen);
    return () => document.body.classList.remove("cgv-mobile-menu-open");
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      setSettingsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>("button");
    if (!button || button.disabled) return;

    const label = buttonLabel(button);

    if (label === "open menu") {
      event.preventDefault();
      event.stopPropagation();
      toggleMobileMenu();
      return;
    }

    if (button.closest(".sidebar-nav")) {
      closeMobileMenu();
      return;
    }

    if (label === "help centre") {
      event.preventDefault();
      event.stopPropagation();
      closeMobileMenu();
      window.open(HELP_CENTRE_URL, "_blank", "noopener,noreferrer");
      return;
    }

    if (label === "settings" || label === "pengaturan") {
      event.preventDefault();
      event.stopPropagation();
      openSettings();
      return;
    }

    if (label === "sign out") {
      // Preserve the app's native React onLogout handler. This controller only
      // closes shared navigation state and removes stale persisted credentials
      // before the logout state transition completes.
      closeMobileMenu();
      closeSettings();
      clearPersistedSession();
      scheduleSignOutFallback();
    }
  }, [closeMobileMenu, closeSettings, openSettings, toggleMobileMenu]);

  const value = useMemo<AppInteractions>(() => ({
    mobileMenuOpen,
    settingsOpen,
    closeMobileMenu,
    closeSettings,
    openSettings,
    toggleMobileMenu,
  }), [closeMobileMenu, closeSettings, mobileMenuOpen, openSettings, settingsOpen, toggleMobileMenu]);

  return (
    <AppInteractionContext.Provider value={value}>
      <div data-cgv-interaction-root onClickCapture={onClickCapture}>
        {children}
        {mobileMenuOpen && (
          <button
            type="button"
            className="button-safety-menu-overlay"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
        )}
      </div>
    </AppInteractionContext.Provider>
  );
}

export function useAppInteractions() {
  const value = useContext(AppInteractionContext);
  if (!value) throw new Error("useAppInteractions must be used inside AppInteractionProvider");
  return value;
}
