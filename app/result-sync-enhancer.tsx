"use client";

import { useEffect } from "react";

type RequestPayload = {
  action?: string;
  token?: string;
  attemptId?: string;
  [key: string]: unknown;
};

type DashboardData = {
  ok?: boolean;
  courses?: Array<Record<string, unknown>>;
  participants?: Array<Record<string, unknown>>;
  scoreboard?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
};

const TOKEN_KEY = "cgv-exams-session-token";
const ROLE_KEY = "cgv-exams-session-role";
const ENDPOINT_KEY = "cgv-exams-api-endpoint";
const AUTO_REFRESH_KEY = "cgv-exams-auto-refresh";

function autoRefreshEnabled() {
  return window.localStorage.getItem(AUTO_REFRESH_KEY) !== "false";
}

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

function responseWithJson(source: Response, value: unknown) {
  const headers = new Headers(source.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json;charset=utf-8");
  return new Response(JSON.stringify(value), {
    status: source.status,
    statusText: source.statusText,
    headers,
  });
}

function setMetric(label: string, value: string) {
  const article = Array.from(document.querySelectorAll<HTMLElement>(".admin-metrics article"))
    .find((item) => item.querySelector("p")?.textContent?.trim().toLowerCase() === label.toLowerCase());
  const target = article?.querySelector<HTMLElement>("strong");
  if (target) target.textContent = value;
}

function setWorkspaceValue(label: string, value: string) {
  const item = Array.from(document.querySelectorAll<HTMLElement>(".workspace-summary > div"))
    .find((element) => element.querySelector("span")?.textContent?.trim().toLowerCase() === label.toLowerCase());
  const target = item?.querySelector<HTMLElement>("strong");
  if (target) target.textContent = value;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.max(0, seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function updateOverview(data: DashboardData) {
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const participants = Array.isArray(data.participants) ? data.participants : [];
  const scoreboard = Array.isArray(data.scoreboard) ? data.scoreboard : [];
  const summary = data.summary || {};
  const activeParticipants = participants.filter((item) => String(item.status || "").toLowerCase() === "active").length;
  const liveCourses = courses.filter((item) => String(item.status || "").toLowerCase() === "live").length;

  setMetric("Active participants", String(activeParticipants));
  setMetric("Live evaluations", String(liveCourses));
  setMetric("Average score", `${Number(summary.average || 0)}%`);
  setMetric("Top score", `${Number(summary.topScore || 0)}%`);
  setWorkspaceValue("Courses", String(courses.length));
  setWorkspaceValue("Participants", String(participants.length));
  setWorkspaceValue("Submissions", String(scoreboard.length));

  const tableBody = document.querySelector<HTMLTableSectionElement>(".leaderboard-card tbody");
  if (!tableBody) return;

  const rows = scoreboard.slice(0, 5).map((item, index) => {
    const row = document.createElement("tr");
    const values = [
      `#${Number(item.rank || index + 1)}`,
      String(item.name || "Participant"),
      String(item.branch || "—"),
      `${Number(item.score || 0)}%`,
      formatDuration(Number(item.durationSeconds || 0)),
      "›",
    ];
    values.forEach((value, columnIndex) => {
      const cell = document.createElement("td");
      if (columnIndex === 1 || columnIndex === 3) {
        const strong = document.createElement("strong");
        strong.textContent = value;
        cell.appendChild(strong);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });
    return row;
  });

  if (rows.length) tableBody.replaceChildren(...rows);
}

export default function ResultSyncEnhancer() {
  useEffect(() => {
    const nativeFetch = window.fetch;
    const originalFetch = nativeFetch.bind(window);
    const channel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("cgv-exams-result-sync")
      : null;

    const enhancedFetch: typeof window.fetch = async (input, init) => {
      const payload = parsePayload(init);
      const action = payload?.action || "";
      const endpoint = requestUrl(input);

      if (action === "submitAttempt") {
        let lastError: unknown;
        let lastResponse: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const candidate = await originalFetch(input, init);
            lastResponse = candidate;
            const data = await candidate.clone().json() as {
              ok?: boolean;
              error?: string;
              result?: Record<string, unknown>;
            };
            if (candidate.ok && data.ok !== false && data.result) {
              sessionStorage.setItem(ENDPOINT_KEY, endpoint);
              channel?.postMessage({ type: "result-synced" });
              window.dispatchEvent(new CustomEvent("cgv:result-synced"));
              return candidate;
            }
            if (/already.*submitted/i.test(String(data.error || "")) && payload?.token && payload?.attemptId) {
              const homeResponse = await originalFetch(endpoint, {
                method: "POST",
                headers: init?.headers,
                body: JSON.stringify({ action: "getParticipantHome", token: payload.token }),
              });
              const homeData = await homeResponse.json() as { history?: Array<Record<string, unknown>> };
              const saved = homeData.history?.find((item) => String(item.id) === String(payload.attemptId));
              if (saved) {
                channel?.postMessage({ type: "result-synced" });
                return responseWithJson(candidate, {
                  ok: true,
                  alreadySubmitted: true,
                  result: {
                    attemptId: payload.attemptId,
                    score: Number(saved.score || 0),
                    correctCount: Number(saved.correctCount || 0),
                    totalQuestions: Number(saved.totalQuestions || 0),
                    durationSeconds: Number(saved.durationSeconds || 0),
                  },
                });
              }
            }
            lastError = new Error(data.error || "The result was not saved.");
          } catch (error) {
            lastError = error;
          }
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 650 * (attempt + 1)));
        }
        if (lastResponse) return lastResponse;
        throw lastError instanceof Error ? lastError : new Error("The result could not be synchronized.");
      }

      const response = await originalFetch(input, init);
      if (action === "login") {
        try {
          const data = await response.clone().json() as {
            ok?: boolean;
            token?: string;
            user?: { role?: string };
          };
          if (data.ok !== false && data.token) {
            sessionStorage.setItem(TOKEN_KEY, data.token);
            sessionStorage.setItem(ROLE_KEY, String(data.user?.role || ""));
            sessionStorage.setItem(ENDPOINT_KEY, endpoint);
          }
        } catch {
          // Leave authentication handling to the application.
        }
      } else if (action === "logout") {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ROLE_KEY);
      }
      return response;
    };

    window.fetch = enhancedFetch;

    let refreshing = false;
    const refreshAdmin = async (force = false) => {
      if (!force && !autoRefreshEnabled()) return;
      if (!force && document.visibilityState !== "visible") return;
      if (refreshing || sessionStorage.getItem(ROLE_KEY) !== "admin") return;
      const token = sessionStorage.getItem(TOKEN_KEY);
      const endpoint = sessionStorage.getItem(ENDPOINT_KEY);
      if (!token || !endpoint || !document.querySelector(".app-shell")) return;

      const scoreboardSelect = document.querySelector<HTMLSelectElement>(".scoreboard-hero select");
      if (scoreboardSelect && !scoreboardSelect.disabled && scoreboardSelect.value) {
        scoreboardSelect.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }

      refreshing = true;
      try {
        const refreshFetch = force || window.fetch === enhancedFetch
          ? originalFetch
          : window.fetch.bind(window);
        const response = await refreshFetch(endpoint, {
          method: "POST",
          headers: { "content-type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "adminGetDashboard", token }),
        });
        const data = await response.json() as DashboardData;
        if (response.ok && data.ok !== false) updateOverview(data);
      } catch {
        // A later interval or focus event retries without interrupting the admin.
      } finally {
        refreshing = false;
      }
    };

    const timer = window.setInterval(() => void refreshAdmin(), 10000);
    const onFocus = () => void refreshAdmin();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshAdmin();
    };
    const onResult = () => void refreshAdmin(true);
    const onSettingsChanged = () => void refreshAdmin();
    const onManualRefresh = () => void refreshAdmin(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("cgv:result-synced", onResult);
    window.addEventListener("cgv:settings-changed", onSettingsChanged);
    window.addEventListener("cgv:settings-refresh-now", onManualRefresh);
    channel?.addEventListener("message", onResult);

    return () => {
      if (window.fetch === enhancedFetch) window.fetch = nativeFetch;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("cgv:result-synced", onResult);
      window.removeEventListener("cgv:settings-changed", onSettingsChanged);
      window.removeEventListener("cgv:settings-refresh-now", onManualRefresh);
      channel?.removeEventListener("message", onResult);
      channel?.close();
    };
  }, []);

  return null;
}
