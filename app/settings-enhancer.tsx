"use client";

import { useEffect, useRef, useState } from "react";
import { useAppInteractions } from "./app-interactions";
import { APP_VERSION_LABEL } from "./app-version";

const STORAGE_KEY = "cgv-exams-interface-settings-v1";
const AUTO_REFRESH_KEY = "cgv-exams-auto-refresh";

type Preferences = {
  compact: boolean;
  reducedMotion: boolean;
  enhancedContrast: boolean;
  autoRefresh: boolean;
  language: "en" | "id";
};

const defaults: Preferences = {
  compact: false,
  reducedMotion: false,
  enhancedContrast: false,
  autoRefresh: true,
  language: "en",
};

function readPreferences(): Preferences {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Partial<Preferences>;
    return {
      compact: Boolean(parsed.compact),
      reducedMotion: Boolean(parsed.reducedMotion),
      enhancedContrast: Boolean(parsed.enhancedContrast),
      autoRefresh: parsed.autoRefresh !== false,
      language: parsed.language === "id" ? "id" : "en",
    };
  } catch {
    return defaults;
  }
}

function applyPreferences(preferences: Preferences) {
  document.body.classList.toggle("cgv-density-compact", preferences.compact);
  document.body.classList.toggle("cgv-reduced-motion", preferences.reducedMotion);
  document.body.classList.toggle("cgv-enhanced-contrast", preferences.enhancedContrast);
  document.documentElement.dataset.cgvDensity = preferences.compact ? "compact" : "comfortable";
  document.documentElement.dataset.cgvMotion = preferences.reducedMotion ? "reduced" : "full";
  document.documentElement.dataset.cgvContrast = preferences.enhancedContrast ? "enhanced" : "standard";
  document.documentElement.dataset.cgvLanguage = preferences.language;
  document.documentElement.lang = preferences.language;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.localStorage.setItem(AUTO_REFRESH_KEY, String(preferences.autoRefresh));
  window.dispatchEvent(new CustomEvent("cgv:settings-changed", { detail: preferences }));
}

export default function SettingsEnhancer() {
  const { settingsOpen, closeSettings } = useAppInteractions();
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    applyPreferences(readPreferences());
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const frame = window.requestAnimationFrame(() => {
      setPreferences(readPreferences());
      setSaved(false);
      closeButtonRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [settingsOpen]);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    applyPreferences(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function reset() {
    setPreferences(defaults);
    applyPreferences(defaults);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function refreshNow() {
    window.dispatchEvent(new CustomEvent("cgv:settings-refresh-now"));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  if (!settingsOpen) return null;

  return (
    <div
      className="cgv-settings-backdrop"
      data-cgv-settings-panel
      role="presentation"
      onMouseDown={closeSettings}
    >
      <section
        className="cgv-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cgv-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="cgv-settings-close"
          aria-label="Close settings"
          onClick={closeSettings}
        >
          ×
        </button>

        <span className="cgv-settings-kicker">PREFERENCES</span>
        <h2 id="cgv-settings-title">Settings</h2>
        <p className="cgv-settings-intro">
          Interface preferences apply immediately. Language is saved to your account.
        </p>

        <div className="cgv-settings-list">
          <div className="cgv-settings-version" aria-label={`App version ${APP_VERSION_LABEL}`}>
            <span>
              <strong>App version</strong>
              <small>The portal checks automatically for a newer release.</small>
            </span>
            <code>{APP_VERSION_LABEL}</code>
          </div>

          <label className="cgv-settings-row cgv-settings-language-row">
            <span>
              <strong>Language</strong>
              <small>Choose the interface language for your account.</small>
            </span>
            <select
              aria-label="Language"
              value={preferences.language}
              onChange={(event) => update("language", event.target.value === "id" ? "id" : "en")}
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </label>

          <label className="cgv-settings-row">
            <span>
              <strong>Compact interface</strong>
              <small>Reduce padding and fit more course and result data on screen.</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.compact}
              onChange={(event) => update("compact", event.target.checked)}
            />
          </label>

          <label className="cgv-settings-row">
            <span>
              <strong>Reduce motion</strong>
              <small>Disable decorative transitions, animated scrolling, and loading movement.</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(event) => update("reducedMotion", event.target.checked)}
            />
          </label>

          <label className="cgv-settings-row">
            <span>
              <strong>Enhanced contrast</strong>
              <small>Increase text, border, helper-label, and focus visibility.</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.enhancedContrast}
              onChange={(event) => update("enhancedContrast", event.target.checked)}
            />
          </label>

          <label className="cgv-settings-row">
            <span>
              <strong>Automatic live refresh</strong>
              <small>Refresh administrator results and scoreboards every ten seconds.</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.autoRefresh}
              onChange={(event) => update("autoRefresh", event.target.checked)}
            />
          </label>
        </div>

        <div className="cgv-settings-actions">
          <button type="button" className="secondary-button" onClick={reset}>Reset defaults</button>
          <button type="button" className="secondary-button" onClick={refreshNow}>Refresh data now</button>
          <button type="button" className="primary-button" onClick={closeSettings}>Done</button>
        </div>

        <div className="cgv-settings-status" role="status" aria-live="polite">
          {saved ? "Settings saved." : "Changes save automatically."}
        </div>
      </section>
    </div>
  );
}
