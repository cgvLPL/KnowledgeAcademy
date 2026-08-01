"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION, APP_VERSION_LABEL } from "./app-version";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
const UPDATE_INTERVAL_MS = 60_000;

type VersionManifest = {
  version?: string;
};

function updateManifestUrl() {
  const endpoint = new URL(`${publicBasePath}/version.json`, window.location.origin);
  endpoint.searchParams.set("check", Date.now().toString(36));
  return endpoint.toString();
}

export default function AppUpdateEnhancer() {
  const [availableVersion, setAvailableVersion] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has("cgv-release")) {
      currentUrl.searchParams.delete("cgv-release");
      window.history.replaceState(window.history.state, "", currentUrl.toString());
    }

    const controller = new AbortController();
    let requestInFlight = false;

    async function checkForUpdate() {
      if (requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      try {
        const response = await fetch(updateManifestUrl(), {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const manifest = await response.json() as VersionManifest;
        const latestVersion = manifest.version?.trim() || "";
        if (latestVersion && latestVersion !== APP_VERSION) {
          setAvailableVersion(latestVersion);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Update checks are best-effort and should never interrupt the portal.
        }
      } finally {
        requestInFlight = false;
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    const initialCheck = window.setTimeout(() => void checkForUpdate(), 1_500);
    const interval = window.setInterval(() => void checkForUpdate(), UPDATE_INTERVAL_MS);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      controller.abort();
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!availableVersion) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("cgv-update-required");
    refreshButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("cgv-update-required");
    };
  }, [availableVersion]);

  function refreshApplication() {
    setRefreshing(true);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("cgv-release", availableVersion);
    window.location.replace(nextUrl.toString());
  }

  if (!availableVersion) return null;

  return (
    <section
      className="cgv-update-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cgv-update-title"
      aria-describedby="cgv-update-description"
    >
      <div className="cgv-update-glow" aria-hidden="true" />
      <div className="cgv-update-content">
        <Image
          className="cgv-update-logo"
          src={`${publicBasePath}/brand/cgv-knowledge-academy.svg`}
          alt="CGV Knowledge Academy"
          width={1450}
          height={360}
          priority
          unoptimized
        />
        <span className="cgv-update-kicker">NEW VERSION AVAILABLE</span>
        <h1 id="cgv-update-title">The academy has been updated.</h1>
        <p id="cgv-update-description">
          Refresh now to load the latest improvements and continue with the newest version of the evaluation portal.
        </p>
        <div className="cgv-update-version" aria-label={`Update from ${APP_VERSION_LABEL} to ${availableVersion}`}>
          <span>{APP_VERSION_LABEL}</span>
          <strong aria-hidden="true">→</strong>
          <span>{availableVersion.replace("+", " · build ")}</span>
        </div>
        <button
          ref={refreshButtonRef}
          type="button"
          className="cgv-update-refresh"
          onClick={refreshApplication}
          disabled={refreshing}
        >
          {refreshing ? "Loading the update..." : "Refresh and update"}
        </button>
        <small>Your session and saved progress remain on this device.</small>
      </div>
    </section>
  );
}
