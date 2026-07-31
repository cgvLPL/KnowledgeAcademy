"use client";

import { useEffect } from "react";

const endpointFromBuild = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim() || "";
const TOKEN_KEY = "cgv-exams-session-token";
const ENDPOINT_KEY = "cgv-exams-api-endpoint";

const READ_TTL: Record<string, number> = {
  adminGetDashboard: 20_000,
  adminGetCourse: 90_000,
  getParticipantHome: 20_000,
};

const INVALIDATING_ACTIONS = new Set([
  "adminSaveCourse",
  "adminDuplicateCourse",
  "adminDeleteCourse",
  "adminSetCourseStatus",
  "adminSaveParticipant",
  "adminSaveUser",
  "adminSetUserStatus",
  "adminResetPassword",
  "submitAttempt",
  "logout",
]);

type RequestPayload = {
  action?: string;
  token?: string;
  courseId?: string;
  [key: string]: unknown;
};

type CacheEntry = {
  storedAt: number;
  status: number;
  statusText: string;
  data: unknown;
};

type LoginResponse = {
  ok?: boolean;
  token?: string;
  user?: {
    id?: string;
    role?: string;
  };
};

type DashboardResponse = {
  ok?: boolean;
  courses?: Array<Record<string, unknown>>;
};

type PerformanceNavigator = Navigator & {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
};

function parsePayload(init?: RequestInit): RequestPayload | null {
  if (typeof init?.body !== "string") return null;
  try {
    return JSON.parse(init.body) as RequestPayload;
  } catch {
    return null;
  }
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function cacheKey(endpoint: string, payload: RequestPayload) {
  return [
    endpoint,
    payload.action || "",
    payload.token || "",
    payload.courseId || "",
  ].join("|");
}

function responseFromEntry(entry: CacheEntry, cacheState: "hit" | "deduped") {
  return new Response(JSON.stringify(entry.data), {
    status: entry.status,
    statusText: entry.statusText,
    headers: {
      "content-type": "application/json;charset=utf-8",
      "x-cgv-performance-cache": cacheState,
    },
  });
}

function normalizedLabel(element: Element) {
  return (element.getAttribute("aria-label") || element.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function InteractionPerformanceEnhancer() {
  useEffect(() => {
    const performanceNavigator = navigator as PerformanceNavigator;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slowUpdates = window.matchMedia("(update: slow)").matches;
    const lowMemory = Boolean(
      performanceNavigator.deviceMemory && performanceNavigator.deviceMemory <= 4,
    );
    const limitedCpu = Boolean(
      performanceNavigator.hardwareConcurrency && performanceNavigator.hardwareConcurrency <= 4,
    );
    const dataSaver = Boolean(performanceNavigator.connection?.saveData);
    const lowPowerMode = reducedMotion || slowUpdates || lowMemory || limitedCpu || dataSaver;

    document.documentElement.classList.toggle("cgv-low-power", lowPowerMode);

    const previousFetch = window.fetch;
    const underlyingFetch = previousFetch.bind(window);
    const cache = new Map<string, CacheEntry>();
    const inFlight = new Map<string, Promise<CacheEntry>>();
    let latestDashboard: DashboardResponse | null = null;
    let warmupTimer = 0;

    const clearReadCache = () => {
      cache.clear();
      inFlight.clear();
      latestDashboard = null;
    };

    const fetchAndStore = async (
      input: RequestInfo | URL,
      init: RequestInit | undefined,
      key: string,
      action: string,
    ): Promise<CacheEntry> => {
      const response = await underlyingFetch(input, init);
      const data = await response.clone().json();
      const entry: CacheEntry = {
        storedAt: Date.now(),
        status: response.status,
        statusText: response.statusText,
        data,
      };
      if (response.ok && (data as { ok?: boolean }).ok !== false) {
        cache.set(key, entry);
        if (action === "adminGetDashboard") latestDashboard = data as DashboardResponse;
      }
      return entry;
    };

    const cachedRead = async (
      input: RequestInfo | URL,
      init: RequestInit | undefined,
      payload: RequestPayload,
    ) => {
      const endpoint = requestUrl(input);
      const action = String(payload.action || "");
      const key = cacheKey(endpoint, payload);
      const ttl = READ_TTL[action] || 0;
      const existing = cache.get(key);
      if (existing && Date.now() - existing.storedAt < ttl) {
        return responseFromEntry(existing, "hit");
      }

      const pending = inFlight.get(key);
      if (pending) return responseFromEntry(await pending, "deduped");

      const request = fetchAndStore(input, init, key, action)
        .finally(() => inFlight.delete(key));
      inFlight.set(key, request);
      return responseFromEntry(await request, "deduped");
    };

    const prefetch = (
      endpoint: string,
      payload: RequestPayload,
      ttlAction = String(payload.action || ""),
    ) => {
      if (!endpoint || !payload.token || !payload.action) return;
      const key = cacheKey(endpoint, payload);
      const existing = cache.get(key);
      const ttl = READ_TTL[ttlAction] || 0;
      if (existing && Date.now() - existing.storedAt < ttl) return;
      if (inFlight.has(key)) return;

      const init: RequestInit = {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      };
      const request = fetchAndStore(endpoint, init, key, ttlAction)
        .catch(() => ({ storedAt: 0, status: 0, statusText: "", data: null }))
        .finally(() => inFlight.delete(key));
      inFlight.set(key, request);
    };

    const enhancedFetch: typeof window.fetch = async (input, init) => {
      const payload = parsePayload(init);
      const action = String(payload?.action || "");

      if (payload && READ_TTL[action]) {
        return cachedRead(input, init, payload);
      }

      const response = await underlyingFetch(input, init);

      if (action === "login") {
        try {
          const data = await response.clone().json() as LoginResponse;
          if (response.ok && data.ok !== false && data.token) {
            const endpoint = requestUrl(input);
            const role = String(data.user?.role || "");
            prefetch(endpoint, {
              action: role === "admin" ? "adminGetDashboard" : "getParticipantHome",
              token: data.token,
            });
          }
        } catch {
          // Authentication remains owned by the application.
        }
      }

      if (payload && INVALIDATING_ACTIONS.has(action) && response.ok) {
        clearReadCache();
      }

      return response;
    };

    window.fetch = enhancedFetch;

    // Warm the Apps Script execution and TLS connection while the loading screen is visible.
    const warmEndpoint = window.sessionStorage.getItem(ENDPOINT_KEY) || endpointFromBuild;
    if (warmEndpoint && !dataSaver && !lowPowerMode) {
      warmupTimer = window.setTimeout(() => {
        void underlyingFetch(warmEndpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "omit",
        }).catch(() => undefined);
      }, 450);
    }

    const prefetchCourseFromControl = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(".inline-actions button");
      if (!button) return;
      const label = normalizedLabel(button);
      if (label !== "preview" && label !== "edit") return;

      const title = button.closest("tr")
        ?.querySelector(".table-title-cell strong")
        ?.textContent?.trim();
      const course = latestDashboard?.courses?.find(
        (item) => String(item.title || "") === String(title || ""),
      );
      const courseId = String(course?.id || "");
      const token = window.sessionStorage.getItem(TOKEN_KEY) || "";
      const endpoint = window.sessionStorage.getItem(ENDPOINT_KEY) || endpointFromBuild;
      if (courseId && token && endpoint) {
        prefetch(endpoint, { action: "adminGetCourse", token, courseId });
      }
    };

    document.addEventListener("pointerover", prefetchCourseFromControl, { passive: true });
    document.addEventListener("focusin", prefetchCourseFromControl);

    return () => {
      window.clearTimeout(warmupTimer);
      document.removeEventListener("pointerover", prefetchCourseFromControl);
      document.removeEventListener("focusin", prefetchCourseFromControl);
      if (window.fetch === enhancedFetch) window.fetch = previousFetch;
      document.documentElement.classList.remove("cgv-low-power");
      clearReadCache();
    };
  }, []);

  return null;
}
